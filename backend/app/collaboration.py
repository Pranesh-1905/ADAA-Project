"""
Collaboration features for ADAA Project
Handles sharing, workspaces, comments, and version history
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId


class ShareRequest(BaseModel):
    task_id: str
    shared_with: List[str]  # List of usernames
    permission: str = "view"  # view or edit


class WorkspaceCreate(BaseModel):
    name: str
    description: str = ""
    members: List[str] = []


class CommentCreate(BaseModel):
    task_id: str
    text: str
    parent_id: Optional[str] = None  # For nested comments


class VersionCreate(BaseModel):
    task_id: str
    changes: dict
    description: str = ""


# Helper functions
def serialize_object_id(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc


async def create_share(db, task_id: str, owner: str, shared_with: List[str], permission: str):
    """Share analysis with other users"""
    share_doc = {
        "task_id": task_id,
        "owner": owner,
        "shared_with": shared_with,
        "permission": permission,
        "created_at": datetime.utcnow(),
        "expires_at": None  # Could add expiration
    }
    result = await db.shares.insert_one(share_doc)
    return result.inserted_id


async def get_shares_for_task(db, task_id: str):
    """Get all shares for a specific task"""
    cursor = db.shares.find({"task_id": task_id})
    shares = [serialize_object_id(share) async for share in cursor]
    return shares


async def get_shared_with_user(db, username: str):
    """Get all analyses shared with a user"""
    cursor = db.shares.find({"shared_with": username})
    shares = [serialize_object_id(share) async for share in cursor]
    return shares


async def create_workspace(db, name: str, description: str, owner: str, members: List[str]):
    """Create a team workspace"""
    workspace_doc = {
        "name": name,
        "description": description,
        "owner": owner,
        "members": members,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "settings": {
            "default_permission": "view"
        }
    }
    result = await db.workspaces.insert_one(workspace_doc)
    return result.inserted_id


async def get_user_workspaces(db, username: str):
    """Get all workspaces where user is owner or member"""
    cursor = db.workspaces.find({
        "$or": [
            {"owner": username},
            {"members": username}
        ]
    })
    workspaces = [serialize_object_id(ws) async for ws in cursor]
    return workspaces


async def add_workspace_member(db, workspace_id: str, username: str):
    """Add a member to workspace"""
    await db.workspaces.update_one(
        {"_id": ObjectId(workspace_id)},
        {
            "$addToSet": {"members": username},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )


async def remove_workspace_member(db, workspace_id: str, username: str):
    """Remove a member from workspace"""
    await db.workspaces.update_one(
        {"_id": ObjectId(workspace_id)},
        {
            "$pull": {"members": username},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )


async def create_comment(db, task_id: str, user: str, text: str, parent_id: Optional[str] = None):
    """Add a comment to an analysis"""
    comment_doc = {
        "task_id": task_id,
        "user": user,
        "text": text,
        "parent_id": parent_id,
        "created_at": datetime.utcnow(),
        "edited": False,
        "likes": 0
    }
    result = await db.comments.insert_one(comment_doc)
    return result.inserted_id


async def get_comments_for_task(db, task_id: str):
    """Get all comments for a specific task"""
    cursor = db.comments.find({"task_id": task_id}).sort("created_at", 1)
    comments = [serialize_object_id(comment) async for comment in cursor]
    return comments


async def update_comment(db, comment_id: str, text: str, user: str):
    """Update a comment (only by original author)"""
    await db.comments.update_one(
        {"_id": ObjectId(comment_id), "user": user},
        {
            "$set": {
                "text": text,
                "edited": True,
                "edited_at": datetime.utcnow()
            }
        }
    )


async def delete_comment(db, comment_id: str, user: str):
    """Delete a comment (only by original author)"""
    await db.comments.delete_one({"_id": ObjectId(comment_id), "user": user})


async def create_version(db, task_id: str, user: str, changes: dict, description: str = ""):
    """Create a version snapshot of analysis"""
    version_doc = {
        "task_id": task_id,
        "user": user,
        "changes": changes,
        "description": description,
        "created_at": datetime.utcnow(),
        "version_number": await get_next_version_number(db, task_id)
    }
    result = await db.versions.insert_one(version_doc)
    return result.inserted_id


async def get_versions_for_task(db, task_id: str):
    """Get version history for a task"""
    cursor = db.versions.find({"task_id": task_id}).sort("created_at", -1)
    versions = [serialize_object_id(version) async for version in cursor]
    return versions


async def get_next_version_number(db, task_id: str):
    """Get the next version number for a task"""
    count = await db.versions.count_documents({"task_id": task_id})
    return count + 1


async def restore_version(db, version_id: str, current_user: str):
    """Restore a specific version"""
    version = await db.versions.find_one({"_id": ObjectId(version_id)})
    if not version:
        return None
    
    # Create a new version snapshot before restoring
    await create_version(
        db,
        version["task_id"],
        current_user,
        version["changes"],
        f"Restored from version {version['version_number']}"
    )
    
    # Update the analysis job with the restored data
    await db.analysis_jobs.update_one(
        {"task_id": version["task_id"]},
        {"$set": {"result": version["changes"]}}
    )
    
    return version["task_id"]
