import type { Context, ESTree, Rule } from '@oxlint/plugins';

type Statement = ESTree.Statement | ESTree.Directive | ESTree.ModuleDeclaration;

const SHORT_BODY_STATEMENTS = 3;
const FUNCTION_BODY = ':function > BlockStatement';
const EXIT_TYPES = new Set(['ReturnStatement', 'ThrowStatement', 'ContinueStatement', 'BreakStatement']);
const BLOCK_DECLARATION_TYPES = new Set([
  'FunctionDeclaration',
  'TSDeclareFunction',
  'ClassDeclaration',
  'TSInterfaceDeclaration',
  'TSEnumDeclaration',
  'TSModuleDeclaration',
]);

const declarations: Rule = {
  meta: {
    type: 'layout',
    docs: { description: 'Separate top-level declarations with a blank line.' },
    fixable: 'whitespace',
    messages: { blankLine: 'Add a blank line between top-level declarations.' },
  },
  create(context) {
    return {
      Program(program) {
        const body = withoutEmptyStatements(program.body);

        for (const [index, next] of body.entries()) {
          const previous = body[index - 1];
          if (previous === undefined || !needsSeparation(previous, next)) {
            continue;
          }
          if (hasBlankLineBetween(context, previous, next)) {
            continue;
          }

          reportMissingBlankLine(context, previous, next);
        }
      },
    };
  },
};

const guards: Rule = {
  meta: {
    type: 'layout',
    docs: { description: 'Put a blank line after a guard clause.' },
    fixable: 'whitespace',
    messages: { blankLine: 'Add a blank line after the guard clause above.' },
  },
  create(context) {
    return {
      [FUNCTION_BODY](functionBody: ESTree.BlockStatement) {
        const body = withoutEmptyStatements(functionBody.body);
        if (isShortBody(body)) {
          return;
        }

        for (const [index, next] of body.entries()) {
          const previous = body[index - 1];
          if (previous === undefined || !isGuard(previous) || continuesGuards(next)) {
            continue;
          }
          if (hasBlankLineBetween(context, previous, next)) {
            continue;
          }

          reportMissingBlankLine(context, previous, next);
        }
      },
    };
  },
};

const result: Rule = {
  meta: {
    type: 'layout',
    docs: { description: 'Put a blank line before the final return of a function.' },
    fixable: 'whitespace',
    messages: { blankLine: 'Add a blank line before the result.' },
  },
  create(context) {
    return {
      [FUNCTION_BODY](functionBody: ESTree.BlockStatement) {
        const body = withoutEmptyStatements(functionBody.body);
        if (isShortBody(body)) {
          return;
        }

        const last = body.at(-1);
        const previous = body.at(-2);
        if (last?.type !== 'ReturnStatement' || previous === undefined || isGuard(previous)) {
          return;
        }
        if (hasBlankLineBetween(context, previous, last)) {
          return;
        }

        reportMissingBlankLine(context, previous, last);
      },
    };
  },
};

export default {
  meta: { name: 'paragraphs' },
  rules: { declarations, guards, result },
};

function needsSeparation(previous: Statement, next: Statement): boolean {
  if (isImport(previous) && isImport(next)) {
    return false;
  }
  if (isImport(previous) !== isImport(next)) {
    return true;
  }
  if (isConstant(previous) && isConstant(next)) {
    return false;
  }
  if (isOverload(previous, next)) {
    return false;
  }

  return isBlockDeclaration(previous) || isBlockDeclaration(next) || spansLines(previous) || spansLines(next);
}

function isImport(statement: Statement): boolean {
  if (statement.type === 'ExportAllDeclaration') {
    return true;
  }
  if (statement.type === 'ExportNamedDeclaration') {
    return statement.source !== null;
  }

  return statement.type === 'ImportDeclaration' || statement.type === 'TSImportEqualsDeclaration';
}

function isConstant(statement: Statement): boolean {
  return unwrapExport(statement).type === 'VariableDeclaration';
}

function isBlockDeclaration(statement: Statement): boolean {
  return BLOCK_DECLARATION_TYPES.has(unwrapExport(statement).type);
}

function isOverload(previous: Statement, next: Statement): boolean {
  const signature = unwrapExport(previous);
  const following = unwrapExport(next);
  if (signature.type !== 'TSDeclareFunction') {
    return false;
  }
  if (following.type !== 'TSDeclareFunction' && following.type !== 'FunctionDeclaration') {
    return false;
  }

  return signature.id !== null && signature.id.name === following.id?.name;
}

function unwrapExport(statement: Statement) {
  const isExport = statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration';
  if (isExport) {
    return statement.declaration ?? statement;
  }

  return statement;
}

function spansLines(statement: Statement): boolean {
  return statement.loc.start.line !== statement.loc.end.line;
}

function isGuard(statement: Statement): boolean {
  if (statement.type !== 'IfStatement' || statement.alternate !== null) {
    return false;
  }

  const consequent = statement.consequent;
  const exit = consequent.type === 'BlockStatement' ? consequent.body.at(-1) : consequent;

  return exit !== undefined && EXIT_TYPES.has(exit.type);
}

function continuesGuards(statement: Statement): boolean {
  return statement.type === 'IfStatement' || statement.type === 'ReturnStatement';
}

function isShortBody(body: readonly Statement[]): boolean {
  return body.length <= SHORT_BODY_STATEMENTS;
}

function hasBlankLineBetween(context: Context, previous: Statement, next: Statement): boolean {
  const linesBetween = context.sourceCode.lines.slice(previous.loc.end.line, next.loc.start.line - 1);

  return linesBetween.some((line) => line.trim() === '');
}

function reportMissingBlankLine(context: Context, previous: Statement, next: Statement): void {
  const text = context.sourceCode.text;
  const lineBreak = text.includes('\r\n') ? '\r\n' : '\n';
  const end = previous.range[1];

  context.report({
    node: next,
    messageId: 'blankLine',
    fix: (fixer) => {
      if (previous.loc.end.line !== next.loc.start.line) {
        const trailing = context.sourceCode
          .getCommentsAfter(previous)
          .filter((comment) => comment.loc.start.line === previous.loc.end.line);
        const anchor = trailing.at(-1)?.range[1] ?? end;
        const lineEnd = text.slice(anchor).search(/\r?\n/) + anchor;

        return fixer.insertTextBeforeRange([lineEnd, lineEnd], lineBreak);
      }
      if (text.slice(end, next.range[0]).trim() !== '') {
        return null;
      }

      const indent = /^\s*/.exec(context.sourceCode.lines[previous.loc.start.line - 1] ?? '')?.[0] ?? '';

      return fixer.replaceTextRange([end, next.range[0]], lineBreak + lineBreak + indent);
    },
  });
}

function withoutEmptyStatements(body: readonly Statement[]): Statement[] {
  return body.filter((statement) => statement.type !== 'EmptyStatement');
}
