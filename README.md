# CodeGreen 🌲

CodeGreen is an AI-powered sustainability analysis tool for your code. It evaluates your source code for energy efficiency and style, provides a "Green" optimized version, and calculates the real-world CO₂ impact your optimizations could have. 


[![CodeGreen Status](https://img.shields.io/badge/CodeGreen-Efficiency%20Master-00FF41?style=for-the-badge&logo=leaf)](https://codegreen.app)

## Features 🚀

- **Multi-language Support:** Analyze Python, JavaScript, C, C++, and Java code.
- **Repository Analysis:** Directly analyze public GitHub repositories by pasting their URL.
- **Granular Radar Scoring:** Receive detailed sub-scores for Formatting, Documentation, Modularity, Readability, and Efficiency.
- **AI Refactoring:** Instantly view an optimized version of your code, complete with inline Diff views and syntax-like highlighting.
- **Environmental Impact Metrics:** Translates saved CPU cycles into actionable environmental metrics (saved grams of CO₂ and equivalent trees planted).
- **Gamification & Badges:** Earn specialized badges (e.g., *Zen Coder*, *Forest Guardian*, *The Phoenix*) based on your code's quality and your improvement over time. These badges are saved locally and can be exported as Markdown for your GitHub README!

## How it Works ⚙️

1. **Input:** Drag-and-drop a source file or paste a GitHub repository link into the web dashboard.
2. **Analysis:** The backend, powered by the **Google Gemini 2.5 Flash** model, processes your code, analyzing it against strict Green Computing standards.
3. **Visualization:** The frontend dynamic dashboard renders the AI response, breaking down your score, displaying the code diff, charting a radar comparison, and awarding any earned badges.

## Prerequisites 📋

- Python 3.9+
- An active Internet connection (for the Gemini SDK and CDN dependencies)
- Google Generative AI API Key (Currently hardcoded in `main.py` for demo purposes, but should be managed via environment variables in production).

## Installation & Setup 💻

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/CodeGreen.git
   cd CodeGreen
   ```

2. **Set up the virtual environment (recommended):**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows, use .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install fastapi uvicorn google-generativeai pydantic
   ```
   *Note: If a `requirements.txt` is added later, use `pip install -r requirements.txt`.*

4. **Run the Backend Server:**
   Navigate into the backend directory and start the FastAPI server:
   ```bash
   cd backend
   python main.py
   # Or using uvicorn directly: uvicorn main:app --reload
   ```

5. **Launch the Frontend:**
   The frontend uses standard HTML/CSS/JS. Simply open `index.html` in your favorite modern browser, or serve it via a local development server (like VS Code Live Server or Python's `http.server`).
   ```bash
   # From the root of CodeGreen
   python -m http.server 3000
   # Then visit http://localhost:3000 in your browser
   ```

## Architecture 🏗️

- **Frontend:** Vanilla HTML, CSS (`style.css`), and JavaScript (`script.js`, `badges.js`). Uses `Chart.js` for the dynamic radar graphs and `canvas-confetti` for celebratory animations. Layouts utilize modular CSS Grid and Flexbox for responsiveness.
- **Backend:** `FastAPI` (Python). Handles the ingestion of code files and repository URLs. It communicates comprehensively with the Google Gemini SDK using a custom prompt tailored for software sustainability and code readability.

## Gamification: The Honor Wall 🏆

CodeGreen wants to make writing efficient code fun! As you submit code, your `eco_score` and `style_score` are recorded.
- Navigate to the **Honor Wall** (`badges.html`) to view your unlocked badges.
- Unlock rare badges like **The Numberjack** (for heavily reducing codebase size) and **The Phoenix** (for dramatically improving weak code).
- Click on any badge to copy its Markdown code to your clipboard, ready to be embedded into your personal projects!

## Contributing 🤝

Contributions are welcome! If you have ideas for new metrics, new languages, or UI improvements, please fork the repository and submit a Pull Request. 

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.
