class CreateChatRooms < ActiveRecord::Migration[8.0]
  def change
    create_table :chat_rooms do |t|
      t.references :echo, null: false, foreign_key: true
      t.references :initiator, null: false, foreign_key: { to_table: :users }
      t.references :responder, null: false, foreign_key: { to_table: :users }
      t.datetime :initiator_left_at
      t.datetime :responder_left_at
      t.datetime :last_message_at

      t.timestamps
      
      t.index [:echo_id, :responder_id], unique: true
    end
  end
end
