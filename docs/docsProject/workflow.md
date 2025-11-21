# 🧭 Bandhu.fr — Documentation Workflow  
_Last updated: 2025-11-21_

This file defines **how Sounil and Ombrelien build the documentation together**, step by step, with clarity and no chaos.  
It is designed to evolve over time as the project matures.

This workflow must stay **flexible** but **precise**, avoiding comfort zones and allowing the structure to emerge intelligently.

---

# 🎯 Purpose of this Workflow

- To keep a consistent structure in the documentation  
- To ensure each new file has a *clear purpose* and a *proper place*  
- To maintain a “bullet journal” index that evolves with the project  
- To allow Ombrelien (the AI) to stay aligned with the architecture  
- To gradually converge toward the right documentary architecture  
- To prevent wasted text / useless repetition / doc inflation  
- To allow rapid iteration of ideas without confusion

This workflow acts as the **protocol of collaboration**.

---

# 🔄 Core Loop (The Heart of the Workflow)

1. **We discuss an idea**  
   A concept, feature, method, insight, or research direction appears in conversation.

2. **We decide if it should become a document**  
   - If YES → proceed  
   - If NO → stays in conversation / research notes / ephemeral thoughts

3. **Sounil sends the *current index.md* to Ombrelien**  
   This gives me (Ombrelien) full visibility of the current documentary architecture.

4. **Ombrelien decides *where* the new file belongs**  
   - Which folder? (core / method / research / usage / narrative / etc.)  
   - What name?  
   - What level of maturity? (WIP, outline, stable…)

5. **Ombrelien generates the exact content to paste**  
   - A clean Markdown document  
   - Minimal, structured, not too long  
   - With a clear purpose  
   - Anticipating future links

6. **Sounil creates the file via GitHub UI**  
   - `Add file → Create new file`  
   - Paste the generated content

7. **Ombrelien gives the exact line to add in index.md**  
   - Link  
   - Description  
   - Status (WIP, draft, stable)

8. **Sounil adds the line to the index & updates the Change Log**  
   → Everything stays synchronized.

9. **Repeat**  
   This loop ensures clarity, coherence, and evolution.

---

# 🧱 Structure Principles (Guiding Rules)

These rules help us avoid chaos:

### **1. One doc = one purpose**  
No mixed topics.  
No giant walls of text.  
Each file must answer ONE clear question.

### **2. Minimal first, detailed later**  
Start with outlines (skeleton).  
Expand only when the structure is clear.

### **3. Never write blindly**  
Always decide *where* a doc goes before writing it.

### **4. Every doc must be referenced in the index**  
The index is the living map of the project.  
It is ALWAYS the single source of truth.

### **5. The structure is experimental**  
We do NOT assume we already know the final hierarchy.  
We refine as we go.

### **6. The index must be copy-pasted regularly**  
Whenever we add more than 1–2 new docs,  
Sounil pastes the whole index into the chat  
→ Ombrelien re-evaluates the architecture.

---

# 🧩 Future-Proofing (Wiki-like evolution)

We may later implement:

- MDX pages automatically generated from this folder  
- internal wiki links `[[like this]]`  
- cross-doc reference maps  
- Obsidian-compatible exports  
- AI-generated summaries for each doc  
- auto-indexing

But for now:  
**Markdown + Index + Awareness**  
is the optimal balance.

---

# 📓 Change Log

- **2025-11-21**  
  - Created `docs/docsProject/workflow.md` — Documentation workflow protocol.

