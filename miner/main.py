import os
import time
import concurrent.futures
from github_client import GithubClient
from parser import extract_functions
from streamer import RedisStreamer

def process_file(client, streamer, owner, repo, branch, filepath, language):
    """
    Downloads raw file content, extracts function/method names, and streams them.
    """
    content = client.get_raw_file_content(owner, repo, branch, filepath)
    if not content:
        return
    
    words = extract_functions(content, language)
    if words:
        repo_name = f"{owner}/{repo}"
        streamer.emit_words(words, repo_name, language)

def mine_repositories(language, extensions):
    """
    Retrieves top repositories and processes their files continuously.
    """
    client = GithubClient()
    streamer = RedisStreamer()
    
    page = 1
    # For a streaming system, we continuously paginate until no more repos, then start over.
    while True:
        try:
            print(f"Fetching {language} repositories (page {page})...")
            repos = client.get_top_repositories(language=language, page=page)
            
            if not repos:
                print("No more repositories found. Restarting from page 1...")
                page = 1
                time.sleep(60)
                continue
                
            for repo in repos:
                owner = repo['owner']['login']
                repo_name = repo['name']
                default_branch = repo.get('default_branch', 'master')
                
                print(f"Processing repository: {owner}/{repo_name}")
                
                # Fetch tree and filter files
                files = client.get_repo_files(owner, repo_name, default_branch, extensions)
                
                # Limit files per repo to avoid getting stuck on humongous monorepos
                max_files_per_repo = 50 
                files_to_process = files[:max_files_per_repo]
                
                # Use a ThreadPool to download and process raw files concurrently
                with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                    futures = []
                    for filepath in files_to_process:
                        futures.append(
                            executor.submit(process_file, client, streamer, owner, repo_name, default_branch, filepath, language)
                        )
                    concurrent.futures.wait(futures)
                    
            page += 1
            
            # Avoid hitting search API rate limits too hard
            time.sleep(5)
            
        except Exception as e:
            print(f"Error during mining: {e}")
            time.sleep(10)

def main():
    print("Starting GitHub Name Miner Service...")
    
    # Wait for Redis to be ready
    time.sleep(5)
    
    # We could run Python and Java concurrently in different threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as main_executor:
        main_executor.submit(mine_repositories, "python", [".py"])
        main_executor.submit(mine_repositories, "java", [".java"])
        
if __name__ == "__main__":
    main()
