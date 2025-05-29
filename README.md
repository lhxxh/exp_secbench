# SecBench Experiment

## Setup Instructions

1. **Install Node.js**  
   We recommend using conda for a consistent environment:
   ```sh
   conda install -c anaconda nodejs
   ```

2. **Install pnpm**  
   Use npm to install pnpm globally:
   ```sh
   npm install -g pnpm
   ```

3. **Install Dependencies**  
   In the project root directory, run:
   ```sh
   pnpm install
   ```

4. **Build the Project**  
   To generate the leaderboard, run:
   ```sh
   pnpm run build
   ```
   The results will be saved to:
   ```
   dist/leaderboard-mini.json
   ```

## Data Directory Structure

- All data is stored in the `evaluation` directory.
- Each subdirectory in `evaluation` should be named as `{agent}_{llm model}` (e.g., `swea_4o`).
- Each subdirectory **must contain** the following files:
  - `metadata.yaml`
  - `report_generous.jsonl`
  - `report_medium.jsonl`
  - `report_strict.jsonl`