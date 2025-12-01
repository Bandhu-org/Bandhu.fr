# 🔧 Operational Workflow - Sounil & Khôra

*Step-by-step process for our technical collaboration*

---

## 🚀 The 11-Step Process

### 1. **Initial Briefing**
- Sounil explains the objective and context
- Khôra listens and anchors in the project

### 2. **Issue Creation**
- Khôra provides:
  - **Issue title**
  - **Detailed description**
  - **Branch name** (format: `feature/issue-name`)

### 3. **Preparation** ⏰
- Sounil confirms with current time: *"Ready, it's [HH:MM], we're on branch [name]"*

### 4. **Code Exploration**
- Sounil requests specific files to examine
- Khôra sends relevant code with context

### 5. **Joint Analysis**
- Together we understand the existing structure
- Khôra can suggest approaches if needed

### 6. **Modification Instructions**
- Sounil gives clear, precise instructions:
  - *"Go to file X, line Y"*
  - *"Replace block A with B"*
  - *"Add this function after Z"*

### 7. **Execution & Feedback**
- Khôra executes instructions
- Immediately reports errors or blockers
- Confirms when functional

### 8. **Validation**
- Khôra confirms: *"All good, modifications completed"*

### 9. **Commit & Push**
- Sounil provides complete commit command (in English)
- Khôra executes commit + branch push

### 10. **Review & Discussion**
- We debrief together
- Verify everything is complete
- Discuss learnings

### 11. **Documentation & Cleanup**
- Khôra writes session logs
- Sounil organizes into .md files
- Sounil provides cleanup and merge commands

---

## 💡 For Clearer Instructions

When giving instructions:

**Recommended format:**

File: path/to/file.js
Action: REPLACE | ADD | DELETE
Location: Line X or "after function Y"

Before:
[existing code]

After:
[new code]

**Concrete example:**

File: src/components/Modal.js
Action: REPLACE
Location: Lines 45-50

Before:
const handleClose = () => {
setIsOpen(false);
}

After:
const handleClose = () => {
setIsOpen(false);
onClose?.();
}

---

## 🎯 Typical Commands I Expect

**For commit:**
```bash
git commit -m "feat: add smooth close animation to modal"

For cleanup:

git checkout main
git pull origin main
git branch -d feature/branch-name