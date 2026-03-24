import requests
import time
import os

class GithubClient:
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.token = os.environ.get("GITHUB_TOKEN")
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"

    def get_top_repositories(self, language, per_page=10, page=1):
        """
        Fetches top repositories by stars for a given language.
        """
        url = f"{self.base_url}/search/repositories"
        params = {
            "q": f"language:{language}",
            "sort": "stars",
            "order": "desc",
            "per_page": per_page,
            "page": page
        }
        response = requests.get(url, headers=self.headers, params=params)
        
        if response.status_code == 403: # Rate limited
            print("Rate limit reached on Github search. Sleeping for 60 seconds...")
            time.sleep(60)
            return self.get_top_repositories(language, per_page, page)
            
        response.raise_for_status()
        return response.json().get('items', [])

    def get_repo_files(self, owner, repo, default_branch, extensions):
        """
        Uses the Git Trees API to get all files in the repository without cloning.
        Recursively fetches the tree.
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 403: # Rate limited
            print("Rate limit reached on Github git trees. Sleeping for 60 seconds...")
            time.sleep(60)
            return self.get_repo_files(owner, repo, default_branch, extensions)
            
        if response.status_code != 200:
            print(f"Failed to fetch tree for {owner}/{repo}: {response.status_code}")
            return []

        tree = response.json().get('tree', [])
        
        # Filter files by extensions
        files = []
        for item in tree:
            if item['type'] == 'blob' and any(item['path'].endswith(ext) for ext in extensions):
                files.append(item['path'])
                
        return files

    def get_raw_file_content(self, owner, repo, branch, filepath):
        """
        Fetches the raw content of a file from raw.githubusercontent.com.
        This endpoint has much more generous rate limits.
        """
        url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{filepath}"
        response = requests.get(url)
        if response.status_code == 200:
            return response.text
        return None
