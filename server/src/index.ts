import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req: Request, res: Response) => {
  res.send('Server is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
