class ChangeEmailNullableInUser < ActiveRecord::Migration[8.0]
  def change
    change_column_null :users, :email, true
    remove_index :users, :email, unique: true
  end
end
