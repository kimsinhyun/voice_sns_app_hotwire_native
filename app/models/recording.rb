class Recording < ApplicationRecord
  belongs_to :user
  has_one_attached :audio_file

  validates :audio_file, presence: true
end
