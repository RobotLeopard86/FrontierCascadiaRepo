import express from 'express';
import { sendMessage } from './discord';

export async function initApi(port: number) {
    const app = express();
    app.use(express.json());

    app.post('/send', async (req, res) => {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        try {
            await sendMessage(message);
            res.json({ success: true });
        } catch (error: any) {
            console.error('Error sending message:', error);

            if (error.message.includes('not ready')) {
                return res.status(503).json({ error: error.message });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }

            res.status(500).json({ error: 'Failed to send message to Discord' });
        }
    });

    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`API Server running on port ${port}`);
            resolve(server);
        });
    });
}
