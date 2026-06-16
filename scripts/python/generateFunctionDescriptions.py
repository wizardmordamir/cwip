import json
import os

# New path for the AI-generated descriptions
descriptions_path = "/Users/austinphillips/code/cwip/scripts/reports/descriptions.json"
file_tree_path = "/Users/austinphillips/code/cwip/scripts/reports/fileTree.json"
output_path = "/Users/austinphillips/code/cwip/_Prompts_PLANS/Reusable_Prompts/README.allFunctions.NEW.md"

def generate_report():
    # Load both data sources
    with open(file_tree_path, 'r') as f:
        tree = json.load(f)
    with open(descriptions_path, 'r') as f:
        descriptions = json.load(f)

    # Flatten the tree (using the recursive function from earlier)
    flat_files = walk_tree(tree) 

    markdown = ["# Library API Reference\n"]

    for entry in flat_files:
        path = entry['filename']
        # Pull the description from our AI-generated JSON
        desc = descriptions.get(path, "No description found.")
        
        markdown.append(f"## {entry['functionName']}")
        markdown.append(f"- **Path:** `{path}`")
        markdown.append(f"- **Summary:** {desc}\n")

    with open(output_path, 'w') as f:
        f.write("\n".join(markdown))