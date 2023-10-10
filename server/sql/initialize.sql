CREATE TABLE IF NOT EXISTS users (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT,
    original_gpt_system TEXT,
    is_ai BOOLEAN NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id INTEGER,
    user_id INTEGER,
    gpt_system TEXT,
    FOREIGN KEY (room_id) REFERENCES chat_rooms (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER,
    user_id INTEGER,
    parent_message_id INTEGER UNIQUE, -- 一意制約を課している
    is_root BOOLEAN NOT NULL, -- 最初のメッセージかどうか
    content TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_message_id) REFERENCES messages (id) ON DELETE CASCADE
);
