# Submission checklist (deadline: Nov 12, 12:00 pm Pacific = Nov 13, ~1:30 AM IST)

- [ ] Registered on paypalaihackathon.devpost.com ("Join Hackathon")
- [ ] **Public GitHub repo** created and pushed; the MIT license shows in the repo's About section
- [ ] Confirm `.env.local` is NOT in the repo (it is git-ignored; run `git ls-files | findstr env` to double check)
- [ ] README setup steps tested once from a clean clone
- [ ] Demo video **under 3:00**, uploaded to **YouTube as Public**, no copyrighted music
- [ ] Paste the text from `SUBMISSION.md` into the Devpost form
- [ ] Add the GitHub URL and YouTube URL on the submission form
- [ ] (Optional) hosted demo URL, e.g. on Render
- [ ] Submit, then re-open the submission and confirm it shows as "Submitted", not "Draft"

Push commands (replace the URL):
```
git add -A
git commit -m "Escrow Agent: PayPal AI Hackathon submission"
git branch -M main
git remote add origin https://github.com/<you>/escrow-agent.git
git push -u origin main
```
