import fs from 'fs';
import path from 'path';

interface Session {
    agentDir: string;
    initialBranch: string;
    workBranch: string;
    creatorId: string;
    permissions: Record<string, 'viewer' | 'collaborator'>;
    model?: string;
    effort?: 'low' | 'medium' | 'high';
}

const SESSIONS_FILE = path.join(process.cwd(), 'sessions.json');

export function getSessions(): Record<string, Session> {
    if (!fs.existsSync(SESSIONS_FILE)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    } catch (e) {
        console.error('Error reading sessions.json:', e);
        return {};
    }
}

export function saveSessions(sessions: Record<string, Session>) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export function getSession(channelId: string): Session | null {
    return getSessions()[channelId] || null;
}

export function createSession(channelId: string, session: Session) {
    const sessions = getSessions();
    sessions[channelId] = session;
    saveSessions(sessions);
}

export function deleteSession(channelId: string) {
    const sessions = getSessions();
    delete sessions[channelId];
    saveSessions(sessions);
}
