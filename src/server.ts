import app from './app';
import { env } from './config/env';

const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST ||'192.168.33.50' // This allows external connections

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`)
    console.log(`Access from mobile: http://${HOST}:${PORT}`)
})