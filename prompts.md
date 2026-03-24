# User Prompts

## 1. Initial Application Generation

> You are a senior software engineer. Generate a complete, minimal but production-quality project that satisfies the following requirements.
> 
> **Goal**
> Build a streaming system that mines function/method names from GitHub repositories (Python + Java) and visualizes word frequencies in real time.
> 
> **High-level architecture**
> - Use a producer–consumer model with two independent services:
>   1. miner (Python)
>   2. visualizer (JavaScript, browser-based)
> - Services must communicate in near real-time using a lightweight mechanism.
> - Prefer simplicity and low overhead.
> 
> **Strong constraints**
> - Minimize GitHub API calls and data transfer.
> - Avoid cloning full repositories when possible.
> - System must run continuously (streaming), processing repos one by one.
> - Must be containerized with Docker.
> - Must be runnable with a single command (e.g., `docker-compose up`).
> 
> **Miner (Python)**
> Responsibilities:
> - Query GitHub API for repositories sorted by stars (descending).
> - Use pagination and stop conditions to simulate continuous mining.
> - Avoid unnecessary API calls:
>   - Fetch only metadata needed.
>   - Use GitHub code search API OR raw file URLs instead of full clones.
> - Process only Python (`.py`) and Java (`.java`) files.
> 
> Extraction logic:
> - Extract function/method names:
>   - Python: `def function_name(...)`
>   - Java: method signatures (basic parsing is fine, no need for full AST)
> - Normalize names into words:
>   - snake_case → split on "_"
>   - camelCase → split on case transitions
>   - lower everything
> - Example:
>   - `make_response` → `[make, response]`
>   - `retainAll` → `[retain, all]`
> 
> Streaming output:
> - Emit words incrementally (NOT batch)
> - Use a simple message broker:
>   - Prefer Redis Pub/Sub OR a lightweight HTTP streaming endpoint
> - Each message should contain:
>   - word
>   - optional metadata (repo name, language used)
> 
> Performance considerations:
> - Cache processed repos (avoid duplicates)
> - Limit number of files per repo
> - Use concurrency but keep it simple (e.g., ThreadPool)
> 
> **Visualizer (JavaScript)**
> - Must run in browser
> - Connect in real-time to miner (via WebSocket or SSE or polling Redis via backend)
> - Maintain a live frequency map of words
> - Display:
>   - Top-N most frequent words (configurable)
> - Visualization options:
>   - Bar chart (preferred for simplicity) OR word cloud
> - Must update incrementally as new words arrive
> 
> **Data flow**
> - Real-time streaming from miner → visualizer
> - No batch files as primary mechanism
> 
> **Containers**
> - Separate Dockerfiles:
>   - miner (Python)
>   - visualizer (Node.js + static frontend)
> - Use docker-compose:
>   - Include Redis if used
> - Services must:
>   - Start independently
>   - Communicate via network
> 
> **Repository structure**
> Generate:
> - `/miner`
>   - `main.py`
>   - `github_client.py`
>   - `parser.py`
>   - `streamer.py`
>   - `requirements.txt`
>   - `Dockerfile`
> - `/visualizer`
>   - `server.js` (if needed)
>   - `frontend` (HTML + JS)
>   - `package.json`
>   - `Dockerfile`
> - `docker-compose.yml`
> - `README.md`
> 
> **README must include**
> - Architecture explanation
> - Design decisions (especially API minimization)
> - How to run (single command)
> - Assumptions and limitations
> 
> **Code quality**
> - Clean, modular, readable
> - No overengineering
> - Add comments where logic is non-trivial
> 
> **Important tradeoffs (explicitly implement these)**
> - Prefer fewer API calls over completeness
> - Prefer partial parsing over full AST
> - Prefer streaming simplicity over scalability
> 
> **Output format**
> - Generate all files with paths
> - Do NOT skip files
> - Ensure project runs without missing dependencies
 
## 2. Planning Pause/Resume Feature

> What would be needed to add a button to stop or continue the scanning?

## 3. Implementing Pause/Resume Feature

> Implement this feature. Make sure to add a message along with the pause button to give info to the user as "the scan will end at this repository" and others if needed.
