class AddDeviceIdToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :device_id, :string
    add_index :users, :device_id, unique: true
  end
end
