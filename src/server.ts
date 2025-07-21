import app from './app';
import { env } from './config/env';

const PORT = Number(process.env.PORT) || 3002;

app.listen(PORT,  () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`Access from mobile: http://localhost:${PORT}`)
})