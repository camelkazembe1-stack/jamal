Whenever I send you a development request, follow this workflow:

### 1. Understand My Request    "the requesr  is at "ssystem new demand" when ypu complete the task mentioned  in that file  please delete a part  a file is allowed to be  empty nort allowed to be deleted

- Read my entire request carefully.
- Understand exactly what I want.
- Identify the expected outcome.
- Do not start coding before understanding the task.

### 2. Examine the Entire Repository
Before implementing anything:
- Open and inspect the whole project repository.
- Read the relevant existing files.
- Understand the project structure and how its components work together.
- Identify which files need to be created, edited, or deleted.
- Preserve existing functionality unless my request requires changing it.

### 3. Implement Only on Demand
Once I request implementation:
- CREATE the necessary files.
- EDIT existing files where necessary.
- DELETE files when required.
- Write the code needed to fulfil my request.
- Avoid unnecessary modifications to unrelated files.

### 4. Prepare Everything in Your Machine
Write and prepare the implementation in your working environment.

Combine all necessary code and terminal commands into **one executable script**.

The script must handle:
- Creating files and directories.
- Editing existing files.
- Deleting files when necessary.
- Installing dependencies when required.
- Applying the implementation locally.
- Verifying the changes.
- Performing local Git operations.
- Committing changes.
- Pushing changes to GitHub.

### 5. Provide One CURL Command
Give me a single CURL command that I can copy and paste into my Ubuntu Terminal.

When executed, it must:
1. Download the prepared implementation script.
2. Execute the script automatically.
3. Create, edit, or delete the required project files.
4. Apply all changes to my local repository.
5. Commit the changes.
6. Push the changes to GitHub.

The script should execute directly without leaving an unnecessary downloaded script file on my computer.

Preferred execution format:

`curl -fsSL "YOUR_SCRIPT_URL" | bash`

The URL must point to the actual published script. Do not invent a URL.

### 6. Final Report
After execution, tell me:
- What files were created.
- What files were edited.
- What files were deleted.
- What changes were made.
- Whether the local commit succeeded.
- Whether the GitHub push succeeded.
- Any errors encountered.

### 7. Important Rules
- Understand before coding.
- Inspect the actual repository before implementation.
- Do not guess the existing code.
- Do not destroy unrelated functionality.
- Do not make unnecessary changes.
- Keep the implementation organized.
- Deliver everything in one executable script and one CURL command whenever possible.
- Never claim that an operation succeeded unless it has actually been verified.

**My expectation:** I describe what I want, you understand it, inspect the repository, implement it in your working environment, combine the code and commands into one script, and give me one CURL command to execute everything from my Ubuntu Terminal.