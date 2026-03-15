import os
import json
import difflib
import subprocess
import tempfile
import asyncio
import shutil
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure Google Gemini SDK
genai.configure(api_key="")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeSubmission(BaseModel):
    code: str
    filename: str

class RepoSubmission(BaseModel):
    repo_url: str

def get_language_from_ext(filename):
    ext = filename.split('.')[-1].lower()
    mapping = {
        'py': 'python',
        'c': 'c',
        'cpp': 'cpp',
        'cc': 'cpp',
        'js': 'javascript',
        'java': 'java'
    }
    return mapping.get(ext, 'python')

class GeminiAnalyzer:
    def __init__(self, code, language="python"):
        self.code = code
        self.language = language
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def analyze(self):
        prompt = f"""
        You are an expert 'Green Computing' Software Engineer. 
        Analyze the following {self.language} code for energy efficiency and style, and provide a fully optimal, refactored version.

        Original Code:
        ```
        {self.code}
        ```

        Evaluate the code based on the following dimensions:
        1. Explain precisely why the refactored code is more efficient.
        2. Provide the FULL, clean refactored code.

        Provide detailed sub-scores (0-100) for drawing a Radar Chart based on BOTH the ORIGINAL code and REFACTORED code. The sub-dimensions are:
        - "formatting": Following standard language conventions.
        - "documentation": Presence of meaningful comments/docstrings.
        - "modularity": Small, focused function blocks.
        - "readability": Clear naming and structure.
        - "efficiency": Big-O complexity and resource usage.

        Also, provide a rough estimate for "Real-world Impact" if ran 1,000,000 times:
        - "cpu_saved_pct": Integer representing % of CPU cycles saved (0-100).

        Respond strictly with JSON:
        {{
            "summary": "[string explanation]",
            "refactored_code": "[full refactored code string]",
            "radar_original": {{ "formatting": [int], "documentation": [int], "modularity": [int], "readability": [int], "efficiency": [int] }},
            "radar_refactored": {{ "formatting": [int], "documentation": [int], "modularity": [int], "readability": [int], "efficiency": [int] }},
            "impact": {{ "cpu_saved_pct": [int] }}
        }}
        """
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            if response_text.startswith("```json"): response_text = response_text[7:]
            if response_text.startswith("```"): response_text = response_text[3:]
            if response_text.endswith("```"): response_text = response_text[:-3]
                
            result_json = json.loads(response_text)
            
            # --- Deterministic Scoring ---
            # Instead of letting the AI hallucinate the top-level scores, we calculate them 
            # rigorously from the AI's radar assessment of the *original* code.
            orig_radar = result_json.get("radar_original", {})
            eco_val = orig_radar.get("efficiency", 80)
            style_vals = [orig_radar.get("formatting", 80), orig_radar.get("documentation", 80), orig_radar.get("readability", 80), orig_radar.get("modularity", 80)]
            style_val = sum(style_vals) // max(1, len(style_vals))
            
            result_json["eco_score"] = eco_val
            result_json["style_score"] = style_val

            # --- Calculate Diff Stats & Carbon ---
            orig_lines = self.code.splitlines()
            new_lines = result_json["refactored_code"].splitlines()
            
            # Heuristic: ~100g of Carbon per line of code over 1,000,000 runs
            cpu_pct = result_json.get("impact", {}).get("cpu_saved_pct", 0)
            carbon_g = round(len(orig_lines) * 100 * (cpu_pct / 100))
            if "impact" not in result_json:
                result_json["impact"] = {}
            result_json["impact"]["carbon_saved_g"] = carbon_g
            new_lines = result_json["refactored_code"].splitlines()
            
            diff = list(difflib.ndiff(orig_lines, new_lines))
            additions = sum(1 for line in diff if line.startswith('+ '))
            deletions = sum(1 for line in diff if line.startswith('- '))
            
            optimization_pct = 0
            if len(orig_lines) > 0:
                # A simple heuristic for % optimized based on lines reduced
                if len(new_lines) < len(orig_lines):
                    optimization_pct = round(( (len(orig_lines) - len(new_lines)) / len(orig_lines) ) * 100)
                else:
                    optimization_pct = round((deletions / len(orig_lines)) * 50) # Assuming active changes mean optimization

            result_json["stats"] = {
                "lines_added": additions,
                "lines_removed": deletions,
                "optimized_pct": min(100, max(0, optimization_pct))
            }
            # Provide raw diff for UI
            result_json["diff_lines"] = diff
            result_json["language"] = self.language
            
            return result_json
        except Exception as e:
            print(f"Gemini API Error: {e}")
            raise Exception("Failed to perform analysis via Gemini API.")

@app.post("/analyze")
async def analyze_code(submission: CodeSubmission):
    try:
        # --- Hackathon Demo Easter Egg ---
        if submission.filename.lower() == "celebrate.py":
            return {
                "eco_score": 99,
                "style_score": 98,
                "summary": "Wow! Your code is already highly optimized. We only made micro-adjustments. You are in the top 1% of Green Developers!",
                "refactored_code": submission.code + "\n\n# CodeGreen: Perfect Optimization Reached 🌱",
                "stats": {
                    "lines_added": 1,
                    "lines_removed": 0,
                    "optimized_pct": 100
                },
                "diff_lines": ["  " + line for line in submission.code.splitlines()] + ["+ # CodeGreen: Perfect Optimization Reached 🌱"],
                "language": "python"
            }
        
        lang = get_language_from_ext(submission.filename)
        analyzer = GeminiAnalyzer(submission.code, lang)
        
        # Run synchronous generate_content in a thread pool so we don't block the async loop
        result = await asyncio.to_thread(analyzer.analyze)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def clone_repo_and_get_files(repo_url: str, limit: int = 5):
    temp_dir = tempfile.mkdtemp()
    try:
        # Clone with depth=1 to save time and bandwidth
        subprocess.run(["git", "clone", "--depth", "1", repo_url, temp_dir], check=True, capture_output=True)
        
        valid_extensions = {'.py', '.js', '.c', '.cpp', '.cc', '.java'}
        source_files = []
        
        for root, _, files in os.walk(temp_dir):
            if '.git' in root or 'node_modules' in root or '__pycache__' in root:
                continue
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in valid_extensions:
                    full_path = os.path.join(root, file)
                    size = os.path.getsize(full_path)
                    rel_path = os.path.relpath(full_path, temp_dir)
                    source_files.append((size, full_path, rel_path, ext))
                    
        # Sort by size descending, take top 'limit'
        source_files.sort(key=lambda x: x[0], reverse=True)
        top_files = source_files[:limit]
        
        file_contents = []
        for size, full_path, rel_path, ext in top_files:
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                file_contents.append({
                    "filename": rel_path,
                    "code": content,
                    "language": get_language_from_ext(rel_path)
                })
            except Exception:
                pass # Skip files that can't be read as text
        return file_contents
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/analyze-repo")
async def analyze_repo(submission: RepoSubmission):
    try:
        # 1. Fetch and filter Top 5 files
        files_to_analyze = await asyncio.to_thread(clone_repo_and_get_files, submission.repo_url, 5)
        
        if not files_to_analyze:
            raise HTTPException(status_code=400, detail="No suitable source files found in the repository.")
            
        # 2. Concurrently analyze the files
        tasks = []
        for f in files_to_analyze:
            analyzer = GeminiAnalyzer(f["code"], f["language"])
            # We add the filename manually to the result later
            task = asyncio.to_thread(analyzer.analyze)
            tasks.append(task)
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 3. Aggregate Results
        valid_results = []
        for file_info, result in zip(files_to_analyze, results):
            if isinstance(result, Exception):
                print(f"Error analyzing {file_info['filename']}: {result}")
                continue
            
            result["filename"] = file_info["filename"]
            valid_results.append(result)
            
        if not valid_results:
            raise HTTPException(status_code=500, detail="Failed to analyze any files from the repository.")

        # Calculate averages for eco/style scores
        avg_eco = sum(r.get("eco_score", 0) for r in valid_results) // len(valid_results)
        avg_style = sum(r.get("style_score", 0) for r in valid_results) // len(valid_results)
        
        # Sum impact stats
        total_cpu_pct_saved = sum(r.get("impact", {}).get("cpu_saved_pct", 0) for r in valid_results)
        # Average the percentage rather than sum for a project-wide perspective
        avg_cpu_pct_saved = total_cpu_pct_saved // len(valid_results)
        
        total_carbon_g_saved = sum(r.get("impact", {}).get("carbon_saved_g", 0) for r in valid_results)
        
        # Aggregate radar stats (simple average)
        agg_radar_orig = {}
        agg_radar_ref = {}
        for dim in ["formatting", "documentation", "modularity", "readability", "efficiency"]:
            agg_radar_orig[dim] = sum(r.get("radar_original", {}).get(dim, 0) for r in valid_results) // len(valid_results)
            agg_radar_ref[dim] = sum(r.get("radar_refactored", {}).get(dim, 0) for r in valid_results) // len(valid_results)
            
        # Aggregate diff stats
        total_added = sum(r.get("stats", {}).get("lines_added", 0) for r in valid_results)
        total_removed = sum(r.get("stats", {}).get("lines_removed", 0) for r in valid_results)
        avg_opt_pct = sum(r.get("stats", {}).get("optimized_pct", 0) for r in valid_results) // len(valid_results)

        aggregated_data = {
            "is_project": True,
            "project_eco_score": avg_eco,
            "project_style_score": avg_style,
            "impact": {
                "cpu_saved_pct": avg_cpu_pct_saved,
                "carbon_saved_g": total_carbon_g_saved
            },
            "radar_original": agg_radar_orig,
            "radar_refactored": agg_radar_ref,
            "stats": {
                "lines_added": total_added,
                "lines_removed": total_removed,
                "optimized_pct": avg_opt_pct
            },
            "analyzed_files": valid_results
        }
        
        return aggregated_data

    except HTTPException:
        raise
    except Exception as e:
        print(f"Repo Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process repository: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
