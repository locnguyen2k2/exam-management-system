export const regSpecialChars = /[.*+?^${}()|[\]\\]/g;
export const regWhiteSpace = /\s+/g;
export const regValidPassword = /^\S*(?=\S{6,})(?=\S*\d)(?=\S*[A-Za-z])\S*$/;
export const regValidStringId = /^(?!-)[a-z0-9-]+(?<!-)$/;
