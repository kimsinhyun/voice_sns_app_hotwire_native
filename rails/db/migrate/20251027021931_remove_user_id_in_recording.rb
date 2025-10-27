class RemoveUserIdInRecording < ActiveRecord::Migration[8.0]
  def change
    remove_column :recordings, :user_id, :bigint
  end
end
