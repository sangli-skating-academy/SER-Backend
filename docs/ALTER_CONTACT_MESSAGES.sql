-- Run this SQL in your PostgreSQL database to add the subject column:
ALTER TABLE contact_messages
ADD COLUMN subject VARCHAR(255);