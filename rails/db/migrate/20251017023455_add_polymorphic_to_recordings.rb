class AddPolymorphicToRecordings < ActiveRecord::Migration[8.0]
  def change
    # 기존 recordings 데이터 삭제 (개발 단계)
    reversible do |dir|
      dir.up do
        Recording.delete_all
      end
    end
    
    add_reference :recordings, :belongable, polymorphic: true, null: false
  end
end
