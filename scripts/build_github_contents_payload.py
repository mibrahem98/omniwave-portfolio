import base64
import json
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) not in (4, 5):
        raise SystemExit("Usage: build_github_contents_payload.py <file> <message> <branch> [sha]")
    file_path = Path(sys.argv[1])
    payload = {
        "message": sys.argv[2],
        "branch": sys.argv[3],
        "content": base64.b64encode(file_path.read_bytes()).decode("ascii"),
    }
    if len(sys.argv) == 5 and sys.argv[4]:
        payload["sha"] = sys.argv[4]
    print(json.dumps(payload, separators=(",", ":")))


if __name__ == "__main__":
    main()
