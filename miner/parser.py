import re

def normalize_name(name):
    """
    Normalizes a function or method name into words.
    - Splitting by underscore (snake_case)
    - Splitting by camelCase transitions
    - Lowercasing everything
    """
    # Split camelCase (e.g., camelCase -> camel Case)
    # Using regex to find lowercase followed by uppercase
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1 \2', name)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1 \2', s1)
    
    # Replace remaining non-alphanumeric characters (like underscores) with spaces
    s3 = re.sub(r'[^a-zA-Z0-9]', ' ', s2)
    
    # Lowercase and split
    words = [w.lower() for w in s3.split() if w]
    return words

def extract_functions(code, language):
    """
    Extracts function/method names from raw code using regex.
    """
    names = []
    if language == 'python':
        # Matches: def function_name(
        # Group 1 is the function name
        pattern = r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
        matches = re.findall(pattern, code)
        names.extend(matches)
    elif language == 'java':
        # Matches typical method signatures
        # e.g., public void methodName(
        # We try to avoid common keywords and match the last word before parenthesis
        # Excludes keywords like if, while, for, switch, catch, try
        pattern = r'(?:(?:public|private|protected|static|final|native|synchronized|abstract|transient)\s+)+[\w<>\[\]]+\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\('
        matches = re.findall(pattern, code)
        for m in matches:
            if m not in ('if', 'for', 'while', 'switch', 'catch', 'new'):
                names.append(m)
    
    # Process normalization
    extracted_words = []
    for name in names:
        extracted_words.extend(normalize_name(name))
        
    return extracted_words
