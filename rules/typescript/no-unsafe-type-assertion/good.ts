interface User {
  name: string;
}

function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string';
}

export function toUser(value: unknown): User {
  if (!isUser(value)) {
    throw new Error('Not a user');
  }
  return value;
}
