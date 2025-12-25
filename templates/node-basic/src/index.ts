import express from 'express';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/', (_req, res) => {
  res.json({ message: 'Hello from node-basic template!' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${port}`);
});
