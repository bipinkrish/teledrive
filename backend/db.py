from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient = None
db = None

async def connect():
    global client, db
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]
    await _ensure_indexes()

async def disconnect():
    if client:
        client.close()

async def _ensure_indexes():
    # files collection
    # Unique constraint on message_id
    await db.files.create_index("message_id", unique=True)

    # Compound indexes matching the actual query patterns in list_files:
    #   { channel_id, folder_path }  +  sort by name
    #   { channel_id, type }         +  sort by name
    #   { channel_id, folder_path, type } for recursive + type filter
    await db.files.create_index(
        [("channel_id", 1), ("folder_path", 1), ("name", 1)],
        name="files_channel_folder_name",
    )
    await db.files.create_index(
        [("channel_id", 1), ("type", 1), ("name", 1)],
        name="files_channel_type_name",
    )
    await db.files.create_index(
        [("channel_id", 1), ("folder_path", 1), ("type", 1), ("name", 1)],
        name="files_channel_folder_type_name",
    )
    # group_id for split-file lookups
    await db.files.create_index("group_id", sparse=True)

    # file_parts collection
    await db.file_parts.create_index(
        [("group_id", 1), ("channel_id", 1), ("part_num", 1)],
        name="parts_group_channel_part",
    )

    # shares collection
    await db.shares.create_index("token", unique=True)
    await db.shares.create_index("channel_id")

def get_db():
    return db
