import $ from 'jquery';

export default class Logger {
	private text: string = '';
	private element: JQuery<HTMLTextAreaElement>;

	/**
	 * Getter for the stored console log text
	 */
	public get _text(): string {
		return this.text;
	}

	/**
	 * Class constructor
	 * @param {string} selector The jQuery selector for the console element to log messages to
	 */
	constructor(selector: string) {
		this.element = $(selector);
	}

	/**
	 * Clears the console element and resets the stored log text
	 */
	public clear(): void {
		this.element.empty();
		this.text = '';
	}

	/**
	 * Logs a message to the console element in with optional color coding and a timestamp
	 *
	 * @param {string} message The message to log
	 * @param {('success'|'error'|'normal')} type The type of message, which determines the color. Can be 'success', 'error', or 'normal'. Defaults to 'normal'
	 * @param {boolean} time Whether to prepend the current time to the message. Defaults to true
	 * @param {boolean} store Whether to store the message in the consoleLog variable. Defaults to true
	 */
	public add(
		message: string,
		type: 'success' | 'error' | 'normal' = 'normal',
		time: boolean = true,
		store: boolean = true,
	): void {
		if (message) {
			this.element.append(
				`<span>${time ? `[${new Date().toLocaleTimeString()}] ` : ''}<span class="text-${type}">${message}</span></span>`,
			);

			if (store) {
				this.text += `${time ? `[${new Date().toLocaleTimeString()}] ` : ''}${message.replace(/<\/?[a-zA-Z]+>/g, '')}\n`;
			}
		} else {
			this.element.append('<span></span>');

			if (store) {
				this.text += '\n';
			}
		}

		this.element.scrollTop(this.element[0].scrollHeight);
	}

	/**
	 * Logs an empty line to the console element
	 */
	public emptyLine(): void {
		const previousLogText: string = this.element.find('>span').last().text();

		if (previousLogText) {
			this.add('', 'normal', false);
		}
	}
}
