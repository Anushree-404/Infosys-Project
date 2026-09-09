/**
 * Profile Validators
 */

import { body } from 'express-validator';

export const updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^(\+91|91|0)?[6-9]\d{9}$/).withMessage('Please provide a valid Indian phone number'),

  body('state')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('State name too long'),

  body('district')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('District name too long'),

  body('preferredLanguage')
    .optional()
    .isIn(['ENGLISH', 'HINDI', 'TELUGU', 'TAMIL', 'KANNADA', 'MARATHI', 'GUJARATI', 'PUNJABI', 'BENGALI', 'ODIA'])
    .withMessage('Invalid language selection'),
];
