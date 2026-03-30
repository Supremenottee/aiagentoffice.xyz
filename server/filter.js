/**
 * Input filter & sanitization — protects against prompt injection,
 * abuse, and garbage input. Production-grade validation.
 */

const BLOCKED_PATTERNS = [
  // Prompt injection attempts
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /you\s+are\s+now\s+/i,
  /new\s+instructions?\s*:/i,
  /system\s*prompt\s*:/i,
  /\bact\s+as\b/i,
  /\brole\s*play\b/i,
  /pretend\s+you\s+are/i,
  /override\s+(your\s+)?instructions/i,
  /bypass\s+(your\s+)?filters/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode\s+enabled/i,

  // Code injection
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']/i,
  /eval\s*\(/i,
  /exec\s*\(/i,
  /import\s*\(/i,
  /require\s*\(/i,
  /__proto__/i,
  /constructor\s*\[/i,

  // Attempting to access system
  /process\.env/i,
  /child_process/i,
  /fs\.(read|write|unlink)/i,
  /\.\.\/\.\.\//,
];

const MAX_CONSECUTIVE_SPECIAL = 10;
const MIN_ALPHA_RATIO = 0.15;

export function validateTaskInput(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'Task cannot be empty' };
  }

  const trimmed = input.trim();

  if (trimmed.length < 5) {
    return { valid: false, reason: 'Task is too short (minimum 5 characters)' };
  }

  if (trimmed.length > parseInt(process.env.MAX_TASK_LENGTH || '2000')) {
    return { valid: false, reason: `Task is too long (maximum ${process.env.MAX_TASK_LENGTH || 2000} characters)` };
  }

  // Check for blocked patterns (prompt injection etc.)
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'Injection attempt detected. Task rejected.' };
    }
  }

  // Check for excessive special characters (likely garbage/attack)
  const specialMatch = trimmed.match(/[^a-zA-Zа-яА-ЯёЁ0-9\s.,!?;:'"()\-–—]/g);
  if (specialMatch && specialMatch.length > MAX_CONSECUTIVE_SPECIAL) {
    const ratio = specialMatch.length / trimmed.length;
    if (ratio > 0.4) {
      return { valid: false, reason: 'Too many special characters. Please describe the task in plain text.' };
    }
  }

  // Check minimum alphabetic content
  const alphaChars = trimmed.match(/[a-zA-Zа-яА-ЯёЁ]/g);
  if (!alphaChars || alphaChars.length / trimmed.length < MIN_ALPHA_RATIO) {
    return { valid: false, reason: 'Task must contain meaningful text.' };
  }

  return { valid: true, sanitized: trimmed };
}

/** Sanitize agent output to prevent XSS when displayed on frontend */
export function sanitizeOutput(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
