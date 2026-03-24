# GitHub Name Miner

A real-time streaming system that extracts function and method names from trending GitHub repositories (Python and Java) and visualizes the word frequencies dynamically in the browser.

## Goal
To efficiently mine large amounts of source code without downloading entire repositories, parse out function names natively, and stream them incrementally to a frontend visualizer with minimal overhead.

## Architecture

* **Miner Service (`/miner`)**: A Python-based worker.
  * Checks the GitHub Search API for trending repositories by stars. 
  * Identifies `.py` and `.java` files using the Git Trees API. 
  * Streams raw file contents from `raw.githubusercontent.com` to bypass restrictive generic API rate limits.
  * Partially parses source code for `def xyz(` or method signatures using Regex, avoiding heavy Abstract Syntax Tree (AST) building.
  * Normalizes the identifiers (splitting snake_case and camelCase, lowercasing) and streams them off immediately to Redis Pub/Sub.

* **Visualizer Service (`/visualizer`)**: A Node.js and static file backend.
  * Connects to Redis and listens for streamed words.
  * Proxies the stream to the browser via Server-Sent Events (SSE).
  * The frontend dynamically updates a Chart.js bar chart and a live-feed UI showing the function frequency.

* **Broker (`redis`)**: Used purely as a lightweight Pub/Sub message broker connecting the Miner and the Visualizer, keeping them completely decoupled.

## Design Decisions and Tradeoffs

1. **API Minimization vs Completeness**: 
    - *Decision*: We use raw GitHub user contents URLs and the Git Trees API instead of cloning repositories or using the heavier Content API.
    - *Tradeoff*: We might miss some files if the tree structure is monstrous, but we drastically reduce bandwidth, disk I/O, and rate-limiting issues compared to `git clone`. We also limit mining to the first 50 matched files per repo so the stream stays fast and diverse.
2. **Regex Parsing vs Full AST**:
    - *Decision*: We use fast Regular Expressions to extract signatures.
    - *Tradeoff*: Regex may capture some false positives (e.g. string literals that look like methods), but it is orders of magnitude faster and lighter than building full ASTs for broken or incomplete raw files.
    - *Comment*: Will later implement better parsing such as AST.
3. **Streaming Simplicity vs Scalability**:
    - *Decision*: Node.js Server-Sent Events (SSE) and Redis Pub/Sub.
    - *Tradeoff*: SSE is incredibly simple and native to the browser without requiring external WebSocket libraries. It is unidirectional (server -> client), which fits exactly this usecase.

## Setup & Running

This project is fully containerized. To run the complete system:

1. Ensure Docker and Docker Compose are installed.
2. Clone/download this folder and navigate to it globally.
3. Run the following command:

```bash
docker compose up --build
```

*(Optional)* To avoid GitHub unauthenticated rate limiting, add a GitHub Personal Access Token to the `miner` service inside `docker-compose.yml`:
```yaml
environment:
  - GITHUB_TOKEN=your_token_here
```

## Viewing the Stream
Once the containers are up:
Open [http://localhost:3000](http://localhost:3000) in your browser.
You will see the top 20 most frequent words updating dynamically as the miner churns through repositories.

## Assumptions and Limitations
- GitHub API enforces strict rate limiting. The app includes sleep fallbacks to handle being throttled, but for continuous smooth operation, a Token is recommended.
- The visualizer only maintains state in-memory (in the browser). If you refresh the page, the statistics map resets, but it will immediately start picking up the ongoing stream.
- Chart updates are throttled to 1 frame per second to prevent client CPU lockup under massive streaming loads.
    
## References
- [Project Generation Prompts](prompts.md)
