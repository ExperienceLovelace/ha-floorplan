//import { LitElement, html, css, } from 'lit-element';
import { css, CSSResult, customElement, html, LitElement, property, TemplateResult, PropertyValues } from "lit-element";

@customElement("example-panel")
export class ExamplePanel extends LitElement {
  @property({ attribute: false }) public hass!: any;
  @property({ type: Boolean }) public narrow!: boolean;
  @property({ attribute: false }) public route!: any;
  @property({ attribute: false }) public panel!: any;

  /*
  hassChanged(value: any, oldValue: any): boolean {
  }
  */

  public requestUpdate(name?: PropertyKey, oldValue?: unknown): Promise<unknown> {
    return super.requestUpdate(name, oldValue);
  }

  protected performUpdate(): void|Promise<unknown>  {
    super.performUpdate();
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    return super.shouldUpdate(_changedProperties);
  }

  protected update(_changedProperties: PropertyValues): void {
    super.update(_changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      <div>
        <p>There are ${Object.keys(this.hass.states).length} entities.</p>
        <p>The screen is${this.narrow ? "" : " not"} narrow.</p>
        Configured panel config
        <pre>${JSON.stringify(this.panel.config, undefined, 2)}</pre>
        Current route
        <pre>${JSON.stringify(this.route, undefined, 2)}</pre>
      </div>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
  }

  get updateComplete(): Promise<unknown> {
    return super.updateComplete;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
        --app-header-border-bottom: 1px solid var(--divider-color);
      }
    `;
  }
}
