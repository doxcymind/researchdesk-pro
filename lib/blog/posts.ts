export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  readTime: string
  category: string
  content: string
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-to-write-a-case-report',
    title: 'How to Write a Case Report: A Step-by-Step Guide for Medical Researchers',
    description: 'Learn how to write a compelling medical case report from scratch — structure, sections, ethical considerations, and tips for getting published in indexed journals.',
    date: '2025-05-20',
    readTime: '8 min read',
    category: 'Writing Guide',
    content: `
## What Is a Case Report?

A case report is a detailed description of the symptoms, signs, diagnosis, treatment, and follow-up of an individual patient. Despite their simplicity, well-written case reports contribute significantly to medical literature — they can describe unusual presentations of common diseases, novel treatments, rare conditions, or unexpected outcomes.

Case reports are among the most read articles in medical journals, and platforms like *NEJM*, *BMJ Case Reports*, and *The Lancet* regularly feature them.

---

## Why Case Reports Matter

- They document rare or unusual clinical findings
- They highlight unexpected drug reactions or interactions
- They generate hypotheses for future research
- They contribute to medical education

According to a 2023 analysis of PubMed submissions, case reports account for approximately 14% of all indexed clinical publications.

---

## Structure of a Medical Case Report

Most journals follow the **CARE (CAse REport) guidelines**, which provide a standardized framework. Here is the recommended structure:

### 1. Title
Be specific and informative. Include:
- The condition or diagnosis
- The most notable feature (e.g., unusual presentation, rare outcome)
- The patient type (age group, demographics if relevant)

**Example:** *"Takotsubo Cardiomyopathy Precipitated by Acute Pancreatitis in a 52-Year-Old Woman: A Case Report"*

### 2. Abstract (150–250 words)
Include:
- Background (why this case is noteworthy)
- Case presentation (key clinical details)
- Conclusions (what the reader should take away)

### 3. Introduction (200–400 words)
- Briefly introduce the condition
- State why this case is unique or educational
- Cite 3–5 key references

### 4. Case Presentation
This is the core of your report. Include:
- **Patient demographics** (age, sex, occupation if relevant — do NOT include identifiable information without consent)
- **Chief complaint and history**
- **Physical examination findings**
- **Investigations** (lab values, imaging, histopathology)
- **Differential diagnosis considered**
- **Final diagnosis**
- **Treatment and management**
- **Follow-up and outcome**

Use a clear chronological narrative. Sub-headings are permitted in many journals.

### 5. Discussion (500–800 words)
This section distinguishes a mediocre case report from an excellent one:
- Compare your case to similar reported cases (literature review)
- Explain the pathophysiology
- Discuss management decisions and rationale
- Highlight what's unique or teachable
- Mention limitations

### 6. Conclusions (1–2 sentences)
State the single most important takeaway for clinicians.

### 7. Patient Consent Statement
**This is mandatory.** Include written informed consent from the patient (or next-of-kin). Most journals require a specific statement.

Example: *"Written informed consent was obtained from the patient for publication of this case report and any accompanying images."*

### 8. References
Follow your target journal's style (Vancouver, APA, AMA). Typically 10–20 references.

---

## Ethical Considerations

Before writing, ensure:
1. **Patient consent is obtained** — verbal consent alone is not sufficient for publication
2. **Anonymisation** — remove names, dates of birth, MRN numbers, and geographic identifiers
3. **IRB/Ethics waiver** — many institutions require written ethics committee confirmation that no IRB approval is needed for case reports
4. **Image consent** — if including clinical photographs, explicit consent is required

---

## Common Mistakes to Avoid

- **Vague discussion** — Don't just describe what happened; explain *why* it matters
- **Missing consent statement** — Automatic rejection at most journals
- **Over-writing the background** — Keep the introduction focused; this is a case report, not a review article
- **No clear teaching point** — Every case report needs an "aha" lesson for the reader
- **Weak title** — Make it specific enough to be found in PubMed searches

---

## Target Journals for Case Reports

| Journal | IF | Turnaround | Open Access |
|---|---|---|---|
| BMJ Case Reports | 1.0 | ~4 weeks | Yes (APC) |
| NEJM Case Records | High | Invited only | No |
| American Journal of Case Reports | 1.2 | ~6 weeks | Yes |
| Oxford Medical Case Reports | 0.8 | ~5 weeks | Yes |
| Cureus | N/A | Fast | Yes (free) |

---

## Using AI to Accelerate Case Report Writing

Modern AI writing tools can significantly reduce the time from data collection to submission. ResearchDesk provides:

- **Section-by-section AI writing** — Generate a structured first draft for each section
- **AI peer review simulation** — Identify gaps before you submit
- **Citation formatting** — Vancouver, APA, AMA in one click
- **Submission checklist** — Specific requirements for your target journal

Writing a compelling case report is no longer a 3-week ordeal. With the right tools and structure, you can go from clinical encounter to submission-ready manuscript in days.

---

## Final Checklist Before Submission

- [ ] CARE guidelines followed
- [ ] Patient consent obtained and statement included
- [ ] Ethics waiver confirmed
- [ ] All patient identifiers removed
- [ ] References formatted correctly
- [ ] Word count within journal limits
- [ ] Cover letter prepared
- [ ] Figures labelled with legends
- [ ] Conflict of interest statement included
    `.trim(),
  },
  {
    slug: 'nejm-submission-guide',
    title: 'NEJM Submission Guide: How to Submit to the New England Journal of Medicine',
    description: 'A complete guide to submitting your manuscript to NEJM — author guidelines, word limits, formatting rules, peer review process, and insider tips from successful authors.',
    date: '2025-05-15',
    readTime: '10 min read',
    category: 'Journal Guide',
    content: `
## About the New England Journal of Medicine

The *New England Journal of Medicine* (NEJM) is arguably the most prestigious medical journal in the world, with an impact factor consistently above 90. Founded in 1812, it publishes approximately 5% of submitted manuscripts. Understanding their exact requirements before submission is not optional — it's essential.

---

## Types of Articles NEJM Accepts

NEJM publishes several article types with different requirements:

| Article Type | Word Limit | Abstract | References |
|---|---|---|---|
| Original Article | 2,700 words | Structured, 150 words | 30–40 |
| Brief Report | 1,500 words | 100 words | 20 |
| Case Record of MGH | 3,500 words | None | 20–30 |
| Review Article | 3,500 words | Structured, 250 words | 60–80 |
| Perspective | 1,200 words | None | 15 |
| Editorial | 750 words | None | 10 |

*Word limits exclude abstract, references, tables, and figure legends.*

---

## Before You Submit: Desk Rejection Checklist

NEJM rejects approximately 70% of manuscripts at the desk review stage (before peer review). Avoid these common pitfalls:

1. **Not a novel contribution** — NEJM requires findings that will "immediately influence clinical practice or biological understanding"
2. **Wrong article type** — Match your study design to the correct article category
3. **Over word limit** — Strictly enforced; manuscripts are returned unreviewed
4. **Incomplete disclosures** — Every author must complete the ICMJE conflict of interest form
5. **No trial registration** — All clinical trials must be registered in an approved registry (ClinicalTrials.gov, ISRCTN, etc.)
6. **Unblinded submissions** — NEJM uses blinded peer review; remove author-identifying information from the manuscript

---

## Formatting Requirements

### Title Page
- Full title (≤100 characters)
- Short title/running head (≤50 characters)
- All authors with credentials (MD, PhD, etc.)
- Institutional affiliations
- Corresponding author with full address, phone, and email
- Word counts for abstract and text separately
- Number of figures and tables

### Abstract
NEJM uses a **structured abstract** for Original Articles:
- **Background** — What was the research question?
- **Methods** — Study design, setting, participants, interventions, outcomes
- **Results** — Key findings with effect sizes and confidence intervals
- **Conclusions** — Clinical implications

Maximum 150 words. Do not include citations in the abstract.

### Statistical Reporting
NEJM has strict statistical reporting standards:
- Report exact P values (not "P < 0.05") for primary outcomes
- Include 95% confidence intervals for all primary outcomes
- Report adjusted and unadjusted estimates separately
- Describe multiple comparisons adjustments
- Use two-sided tests unless pre-specified as one-sided

### References
- **Vancouver format** (numbered, superscript)
- Maximum 30–40 for Original Articles
- Include DOI where available
- Cite primary sources — avoid secondary citations
- Journals are abbreviated per NLM catalog

---

## Figures and Tables

### Figures
- TIFF format preferred; minimum 300 DPI
- Each figure must be understandable without reading the text
- Limit: 6 figures for Original Articles (combined total with tables)
- Clinical photographs require explicit patient consent

### Tables
- Must be editable (Word format, not images)
- Place statistical measures in footnotes
- Avoid tables that duplicate text

---

## Ethical Requirements

These are non-negotiable at NEJM:

1. **IRB Approval** — Required for all human subjects research; state the protocol number
2. **Informed Consent** — State whether written or waived
3. **ICMJE Conflict of Interest Forms** — Completed by every author (submitted separately)
4. **Data Sharing Statement** — NEJM requires a statement on data availability; a data sharing plan is required for clinical trials
5. **Trial Registration** — Before first enrollment; retrospective registration results in rejection

---

## The Submission Process

NEJM uses the **Editorial Manager** system at *editorialmanager.com/nejm*.

**Step-by-step:**
1. Create an account or log in
2. Select "Submit New Manuscript"
3. Choose article type
4. Upload files in order: title page → main text → tables → figures → supplementary
5. Enter all co-authors and confirm their email addresses
6. Complete the submission questionnaire (previous submissions, ethical approvals, etc.)
7. Submit ICMJE forms for all authors

**Cover letter essentials:**
- Why is this finding important for NEJM's readership?
- What clinical problem does it address?
- Novelty statement — what's new vs. what was previously known
- Confirm it has not been submitted/published elsewhere

---

## Peer Review Timeline

| Stage | Typical Duration |
|---|---|
| Desk review | 1–3 weeks |
| Peer review (if passed) | 4–8 weeks |
| Decision after review | 1–2 weeks |
| Revision turnaround (your end) | 4–8 weeks |
| Final decision | 2–4 weeks |
| Production (if accepted) | 3–6 weeks |

Total: typically 6–12 months from submission to publication.

---

## Responding to Reviewer Comments

NEJM peer review is rigorous. When you receive revisions:

1. **Address every comment** — point-by-point response is mandatory
2. **Be diplomatic** — Disagree respectfully with evidence
3. **Track changes** — Submit revised manuscript with tracked changes + clean version
4. **Letter length** — 3–8 pages is typical for a thorough response
5. **Don't over-revise** — Only change what reviewers asked for; unnecessary changes raise flags

---

## Tips from Successful NEJM Authors

- **Lead with the clinical impact** — Start the introduction with the problem, not the background
- **One clear finding** — Don't try to answer five questions; answer one definitively
- **Pre-submission enquiry** — For landmark trials, email the editors before full submission
- **Statistical consultation** — Have a biostatistician review your analysis plan
- **Native language editing** — Non-native English manuscripts benefit from professional editing

---

## Using ResearchDesk for NEJM Submissions

Our submission checklist tool generates a real-time checklist specific to NEJM's current author guidelines. It covers:

- Word limits per section
- Required ICMJE forms
- Data sharing statement requirements
- Statistical reporting standards
- Figure and table specifications

Generate your personalized NEJM submission checklist in under 30 seconds.
    `.trim(),
  },
  {
    slug: 'vancouver-citation-style-guide',
    title: 'Vancouver Citation Style: The Complete Guide for Medical Researchers',
    description: 'Everything you need to know about Vancouver citation style — how to format journal articles, books, websites, and more. With worked examples for every reference type.',
    date: '2025-05-10',
    readTime: '7 min read',
    category: 'Citation Guide',
    content: `
## What Is Vancouver Citation Style?

Vancouver style is the **standard citation format for medical and biomedical sciences**. Named after the 1978 Vancouver meeting that established the Uniform Requirements for Manuscripts Submitted to Biomedical Journals, it is used by thousands of journals including *NEJM*, *The Lancet*, *JAMA*, *BMJ*, and *Nature Medicine*.

Vancouver style uses **numbered references** cited in order of appearance in the text, with the bibliography listed numerically at the end of the document.

---

## Basic Principles

1. **Sequential numbering** — References are numbered [1], [2], [3]... in the order they first appear in the text
2. **Superscript or square brackets** — In-text citations use either ¹ or [1] (check your journal's preference)
3. **Author names** — Surname followed by initials (no periods); list all authors if ≤6, use "et al." for 7+
4. **Journal abbreviations** — Use NLM catalog abbreviations (e.g., *N Engl J Med*, not *New England Journal of Medicine*)
5. **No "ibid"** — Repeat the full citation; don't use shorthand for repeat citations

---

## Journal Article Format

**Standard Format:**
> AuthorLastname Initials, AuthorLastname Initials. Title of article. Journal Abbreviation. Year;Volume(Issue):Pages.

**Single Author Example:**
> Smith JA. Cardiovascular outcomes in type 2 diabetes. N Engl J Med. 2021;384(3):210-218.

**Multiple Authors (≤6) Example:**
> Smith JA, Brown BC, Chen XY, Patel RK, Williams TM, Jones SE. Multiorgan effects of SGLT-2 inhibitors in diabetic nephropathy. Lancet. 2022;399(10341):2060-2072.

**Seven or More Authors (et al.):**
> Smith JA, Brown BC, Chen XY, Patel RK, Williams TM, Jones SE, et al. A randomized trial of intensive blood pressure control. JAMA. 2020;323(12):1143-1152.

**Article with DOI:**
> Kim HJ, Park JS. Long-term outcomes of bariatric surgery. Obes Rev. 2023;24(2):e13542. doi:10.1111/obr.13542

---

## Book References

**Entire Book:**
> AuthorLastname Initials. Title of Book. Edition. Place of Publication: Publisher; Year.

**Example:**
> Harrison TR, Kasper DL. Harrison's Principles of Internal Medicine. 21st ed. New York: McGraw-Hill; 2022.

**Chapter in an Edited Book:**
> AuthorLastname Initials. Chapter title. In: EditorLastname Initials, editor. Book Title. Edition. Place: Publisher; Year. p. Pages.

**Example:**
> Longo DL. Approach to the patient with anaemia. In: Kasper DL, Fauci AS, editors. Harrison's Haematology and Oncology. 3rd ed. New York: McGraw-Hill; 2020. p. 1-12.

---

## Website / Online Sources

> AuthorLastname Initials or Organisation Name. Title of webpage [Internet]. Place: Publisher; Year [cited Year Month Day]. Available from: URL

**Example (Organisation as Author):**
> World Health Organization. Global tuberculosis report 2023 [Internet]. Geneva: WHO; 2023 [cited 2024 Jan 15]. Available from: https://www.who.int/tb/publications/global_report/en/

**Example (Individual Author):**
> National Institute for Health and Care Excellence. Hypertension in adults: diagnosis and management [Internet]. London: NICE; 2022 [cited 2024 Feb 3]. Available from: https://www.nice.org.uk/guidance/ng136

---

## Conference Papers

> AuthorLastname Initials. Title of presentation. In: EditorLastname Initials, editor. Conference Name; Date; Place. Publisher; Year. p. Pages.

**Example:**
> Williams R, Chen S. Machine learning in sepsis prediction: a multi-centre validation. In: Annual Congress of the European Society of Intensive Care Medicine; 2023 Oct 7-11; Milan, Italy. Brussels: ESICM; 2023. p. 45-50.

---

## Thesis / Dissertation

> AuthorLastname Initials. Title [dissertation/thesis]. Place: University Name; Year.

**Example:**
> Okonkwo AC. Predictors of 30-day readmission in heart failure patients [dissertation]. London: Imperial College London; 2022.

---

## Common Mistakes and How to Fix Them

### Mistake 1: Using full journal names
❌ *New England Journal of Medicine*
✅ *N Engl J Med*

Use the NLM catalog at nlm.nih.gov/tsd/cataloging/contructitleabbr.html to find correct abbreviations.

### Mistake 2: Punctuation errors
❌ Smith, J.A., and Brown, B.C. (2021). Cardiac outcomes. N. Engl. J. Med. 384(3), 210.
✅ Smith JA, Brown BC. Cardiac outcomes. N Engl J Med. 2021;384(3):210-218.

### Mistake 3: Forgetting page ranges
❌ N Engl J Med. 2021;384(3):210.
✅ N Engl J Med. 2021;384(3):210-218.

### Mistake 4: Wrong author count threshold
- ≤6 authors: list all
- 7+ authors: list first 6, then "et al."

### Mistake 5: Using [cited] for print sources
- Only include [cited date] for online sources
- Print books and journals do not need a citation date

---

## Vancouver vs. APA vs. AMA

| Feature | Vancouver | APA 7th | AMA |
|---|---|---|---|
| Used in | Medicine, biology | Social sciences | Medical journals |
| In-text | [1] or superscript ¹ | (Smith, 2021) | Superscript ¹ |
| Bibliography order | Sequential | Alphabetical | Sequential |
| Author format | Surname Initials | Surname, I. | Surname Initials |
| Year placement | End of citation | After author | End of citation |

---

## Automating Vancouver Citations

Manual formatting is error-prone and time-consuming. ResearchDesk's citation formatter:

1. **Accepts raw input** — paste a DOI, title, or partial reference
2. **AI-formats to Vancouver** — generates the exact correct format
3. **Supports all types** — journals, books, websites, conference papers
4. **Exports ready-to-paste** — copy a formatted reference in one click

Most researchers spend 2–4 hours on citations for a single manuscript. With AI-powered formatting, that drops to under 10 minutes.

---

## Quick Reference Card

**Journal Article:**
\`Surname Initials. Title. J Abbrev. Year;Vol(Issue):Pages.\`

**Book:**
\`Surname Initials. Title. Xth ed. City: Publisher; Year.\`

**Website:**
\`Author/Org. Title [Internet]. City: Publisher; Year [cited YYYY Mon DD]. Available from: URL\`

**Book Chapter:**
\`Author Initials. Chapter title. In: Editor Initials, editor. Book Title. Xth ed. City: Publisher; Year. p. XX-XX.\`
    `.trim(),
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug)
}
