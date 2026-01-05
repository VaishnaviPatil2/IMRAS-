exports.getAllPRs = async (req, res) => {
  res.json({ message: "PR controller working", prs: [] });
};

exports.getPRById = async (req, res) => {
  res.json({ message: "Get PR by ID working" });
};

exports.createPR = async (req, res) => {
  res.json({ message: "Create PR working" });
};

exports.updatePR = async (req, res) => {
  res.json({ message: "Update PR working" });
};

exports.approvePR = async (req, res) => {
  res.json({ message: "Approve PR working" });
};

exports.deletePR = async (req, res) => {
  res.json({ message: "Delete PR working" });
};