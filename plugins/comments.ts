import type { ESTree, Rule } from '@oxlint/plugins';

const ADR_REFERENCE = /^ADR-\d+: \S/;
const TOOL_DIRECTIVES = [
  /^(?:oxlint|eslint)-(?:disable|enable)(?:-next-line|-line)?(?:\s|$)/,
  /^@ts-expect-error(?:\s|$)/,
  /^\/\s*<reference\s/,
  /^(?:oxfmt|prettier)-ignore(?:\s|$)/,
  /^@(?:vitest|jest)-environment\s/,
  /^(?:c8|v8|istanbul) ignore\s/,
];

const adrOnly: Rule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Allow a comment only when it points to an ADR, or is a directive for a tool.' },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      notAdr: 'Make the code explain itself. Keep a comment only for a deliberate choice, as `// ADR-012: why this differs`.',
    },
  },
  create(context) {
    const allowed = [ADR_REFERENCE, ...TOOL_DIRECTIVES, ...extraPatterns(context.options[0])];

    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Shebang' || isAllowed(comment, allowed)) {
            continue;
          }

          context.report({ loc: comment.loc, messageId: 'notAdr' });
        }
      },
    };
  },
};

export default {
  meta: { name: 'comments' },
  rules: { 'adr-only': adrOnly },
};

function isAllowed(comment: ESTree.Comment, allowed: readonly RegExp[]): boolean {
  const text = commentText(comment);

  return allowed.some((pattern) => pattern.test(text));
}

function commentText(comment: ESTree.Comment): string {
  if (comment.type === 'Line') {
    return comment.value.trim();
  }

  return comment.value.replace(/^[\s*]+/, '').trim();
}

function extraPatterns(options: unknown): RegExp[] {
  if (typeof options !== 'object' || options === null || !('allow' in options) || !Array.isArray(options.allow)) {
    return [];
  }

  return options.allow.filter((pattern) => typeof pattern === 'string').map((pattern) => new RegExp(pattern));
}
