import { css, CSSResult, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lit-toast')
export class LitToast extends LitElement {
  @property({ type: String }) public _toastText!: string;

  constructor() {
    super();

    this._toastText = '';
  }

  protected render(): TemplateResult {
    return html` <div role="alert">${this._toastText}</div> `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: none;
        justify-content: center;
        width: 100%;
        /*visibility: hidden;*/
        position: fixed;
        z-index: var(--lt-z-index, 2);
        bottom: var(--lt-bottom, 40px);
      }

      :host(.show) {
        display: flex;
        /*visibility: visible;*/
        -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
        animation: fadein 0.5s, fadeout 0.5s 2.5s;
      }

      div {
        min-width: 100px;
        background-color: var(--lt-background-color, #292929);
        color: var(--lt-color, #dddddd);
        text-align: center;
        border-radius: var(--lt-border-radius, 2px);
        padding: var(--lt-padding, 16px);
        border: var(--lt-border, none);
        font-size: var(--lt-font-size, 1em);
        font-family: var(--lt-font-family, sans-serif);
      }

      @-webkit-keyframes fadein {
        from {
          bottom: 0;
          opacity: 0;
        }
        to {
          bottom: var(--lt-bottom, 40px);
          opacity: 1;
        }
      }

      @keyframes fadein {
        from {
          bottom: 0;
          opacity: 0;
        }
        to {
          bottom: var(--lt-bottom, 40px);
          opacity: 1;
        }
      }

      @-webkit-keyframes fadeout {
        from {
          bottom: var(--lt-bottom, 40px);
          opacity: 1;
        }
        to {
          bottom: 0;
          opacity: 0;
        }
      }

      @keyframes fadeout {
        from {
          bottom: var(--lt-bottom, 40px);
          opacity: 1;
        }
        to {
          bottom: 0;
          opacity: 0;
        }
      }
    `;
  }

  // To read out loud the toast
  firstUpdated(): void {
    this.style.setProperty('aria-live', 'assertive');
    this.style.setProperty('aria-atomic', 'true');
    this.style.setProperty('aria-relevant', 'all');
  }

  show(text = ''): void {
    if (this.className === 'show') {
      // Do nothing, prevent spamming
    } else {
      this._toastText = text;
      this.className = 'show';
      setTimeout(() => {
        this.className = this.className.replace('show', '');
      }, 3000);
    }
  }
}
