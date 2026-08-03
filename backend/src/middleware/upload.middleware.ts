/**
 * File Upload Middleware
 * Multer configuration for profile photo uploads
 */

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Ensure upload directory exists
const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
const profileUploadPath = path.join(uploadPath, 'profiles');

if (!fs.existsSync(profileUploadPath)) {
  fs.mkdirSync(profileUploadPath, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, profileUploadPath);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `profile-${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter - only allow images
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

// Multer upload instance
export const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
    files: 1,
  },
}).single('profilePhoto');

/**
 * Delete file from disk
 */
export const deleteFile = (filePath: string): void => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
