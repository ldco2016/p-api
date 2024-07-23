const createClient = require("./queries/create-client");
const { validateId } = require("./queries/id");
const dbExists = require("./queries/db-exists");
const touchLogin = require("./queries/touch-login");

module.exports = async (req, res) => {
  const { id } = req.session;

  console.log("Session:", id);
  if (!id) {
    return res.status(400).json({ error: "Session ID is missing" });
  }
  validateId(id);

  if (!(await dbExists(id))) {
    throw new Error("No database found. Reload this page.");
  }
  await touchLogin(id);

  const client = await createClient(id);

  try {
    console.log("Query:", req.body.query);
    const result = await client.query(req.body.query);

    if (Array.isArray(result)) {
      res.send(
        result.map(({ rows, fields, command, rowCount }) => ({
          command,
          rows,
          fields,
          rowCount,
        }))
      );
    } else {
      res.send([
        {
          command: result.command,
          rows: result.rows,
          fields: result.fields,
          rowCount: result.rowCount,
        },
      ]);
    }
  } catch (err) {
    console.error("Query Execution Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    await client.end();
  }
};
