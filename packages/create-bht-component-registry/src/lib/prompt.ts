import prompts from "prompts";

export interface TextPrompt {
  message: string;
  initial?: string;
  /** Return true to accept, or the message to show. */
  validate?: (value: string) => true | string;
}

export interface ConfirmPrompt {
  message: string;
  initial?: boolean;
}

/**
 * The two questions the CLI ever asks, behind an interface so tests can
 * answer them without a TTY. `undefined` means the user cancelled (Ctrl-C),
 * which commands treat as "stop, change nothing".
 */
export interface Prompter {
  text(prompt: TextPrompt): Promise<string | undefined>;
  confirm(prompt: ConfirmPrompt): Promise<boolean | undefined>;
}

export const interactivePrompter: Prompter = {
  async text({ message, initial, validate }) {
    let cancelled = false;
    const answers = await prompts(
      {
        type: "text",
        name: "value",
        message,
        initial,
        validate: validate ? (value: string) => validate(value) : undefined,
      },
      {
        onCancel: () => {
          cancelled = true;
        },
      },
    );
    const value: unknown = answers.value;
    return cancelled || typeof value !== "string" ? undefined : value;
  },

  async confirm({ message, initial = false }) {
    let cancelled = false;
    const answers = await prompts(
      { type: "confirm", name: "value", message, initial },
      {
        onCancel: () => {
          cancelled = true;
        },
      },
    );
    const value: unknown = answers.value;
    return cancelled || typeof value !== "boolean" ? undefined : value;
  },
};
