-- Usersテーブルにサンプルデータを挿入
INSERT INTO users (username, password, is_ai) VALUES ('user1', 'password1', 0);
INSERT INTO users (username, password, is_ai) VALUES ('user2', 'password2', 1);

-- Chat Roomsテーブルにサンプルデータを挿入
INSERT INTO chat_rooms (name) VALUES ('Room1');
INSERT INTO chat_rooms (name) VALUES ('Room2');

-- Chat Room Membersテーブルにサンプルデータを挿入
INSERT INTO chat_room_members (room_id, user_id) VALUES (1, 1);
INSERT INTO chat_room_members (room_id, user_id) VALUES (2, 2);

-- Messagesテーブルにサンプルデータを挿入
INSERT INTO messages (room_id, user_id, parent_message_id, is_root, content) VALUES (1, 1, NULL, 1, 'Hello Room1');
INSERT INTO messages (room_id, user_id, parent_message_id, is_root, content) VALUES (2, 2, NULL, 1, 'Hello Room2');
