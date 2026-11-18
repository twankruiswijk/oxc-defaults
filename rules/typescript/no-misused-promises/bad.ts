declare function save(): Promise<void>;

export function listen(button: HTMLButtonElement): void {
  button.addEventListener('click', async () => {
    await save();
  });
}
