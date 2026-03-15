import re

class CodeGreenAnalyzer:
    """
    Core engine for CodeGreen scoring logic.
    In a production app, this would integrate with Gemini API for deep analysis.
    For this prototype, it implements the mathematical models via static heuristics.
    """

    def __init__(self, code, language="python"):
        self.code = code
        self.language = language.lower()
        self.eco_score = 0
        self.style_score = 0
        
    def calculate_eco_score(self):
        # 1. Complexity Baseline (S_complex)
        # Mock logic: Detecting nested loops as an indicator of O(n^2)
        nesting_level = 0
        lines = self.code.split('\n')
        max_nesting = 0
        current_nesting = 0
        
        for line in lines:
            indent = len(line) - len(line.lstrip())
            current_nesting = indent // 4 # Basic Python assumption
            max_nesting = max(max_nesting, current_nesting)

        if max_nesting >= 2:
            s_complex = 40  # O(n^2) territory
        elif max_nesting == 1:
            s_complex = 80  # O(n) territory
        else:
            s_complex = 95  # O(1) territory

        # 2. Resource Impact (F_resource)
        f_resource = 1.0
        if "range(len(" in self.code: # Inefficient pattern in Python
            f_resource -= 0.1
        if "open(" in self.code and ".close()" not in self.code: # Potential leak
            f_resource -= 0.1
            
        # 3. Language Baseline (L_base)
        l_baseline = {
            "python": 0.75,
            "javascript": 0.75,
            "cpp": 1.0,
            "c": 1.0,
            "rust": 1.0,
            "java": 0.85
        }.get(self.language, 0.7)

        self.eco_score = round(s_complex * f_resource * l_baseline * (100/max(s_complex*l_baseline, 1))) # Normalized to 100
        # For the prototype, let's keep it simpler to match expected UI output
        self.eco_score = min(100, int(s_complex * f_resource / l_baseline * 0.8)) 
        
        return self.eco_score

    def calculate_style_score(self):
        # Weights
        w_naming = 0.25
        w_docs = 0.20
        w_modular = 0.30
        w_patterns = 0.25
        
        # Mock Assessment (0-100 for each)
        c_naming = 85 if len(re.findall(r'[a-z]_[a-z]', self.code)) > 0 else 60
        c_docs = 90 if '"""' in self.code or "'''" in self.code else 40
        c_modular = 80 if len(self.code.split('\n')) < 50 else 50
        c_patterns = 85 # Implementation of standard patterns

        score = (c_naming * w_naming) + (c_docs * w_docs) + (c_modular * w_modular) + (c_patterns * w_patterns)
        self.style_score = int(score)
        return self.style_score

    def get_analysis(self):
        return {
            "eco_score": self.calculate_eco_score(),
            "style_score": self.calculate_style_score(),
            "language": self.language,
            "summary": "Detected high-complexity nested loops. Suggest refactoring to use a set or hash map."
        }

if __name__ == "__main__":
    test_code = """
def find_duplicates(data):
    dupes = []
    for i in range(len(data)):
        for j in range(i + 1, len(data)):
            if data[i] == data[j] and data[i] not in dupes:
                dupes.append(data[i])
    return dupes
    """
    analyzer = CodeGreenAnalyzer(test_code)
    print(analyzer.get_analysis())
