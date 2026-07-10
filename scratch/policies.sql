CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own core_disciplines" ON core_disciplines FOR DELETE USING (auth.uid() = user_id);
