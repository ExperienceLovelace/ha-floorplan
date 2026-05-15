import { html, css, LitElement, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { load, dump } from 'js-yaml';
import type { HomeAssistant } from '../../lib/homeassistant/types';
import type {
  LovelaceCardConfig,
  LovelaceConfig,
} from '../../lib/homeassistant/data/lovelace';
import type { LovelaceCardEditor } from '../../lib/homeassistant/panels/lovelace/types';


@customElement('floorplan-card-editor')
export class FloorplanCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @state() private _config: LovelaceCardConfig = { type: 'custom:floorplan-card' };
  @state() private _error?: string;

  public setConfig(config: LovelaceCardConfig): void {
    this._config = { ...config };
  }

  private _fireConfigChanged(config: LovelaceCardConfig): void {
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _valueChanged(event: Event): void {
    const target = event.target as any & {
      value?: string;
      detail?: { value?: string };
    };
    const name = target.name ?? target.attributes?.name?.nodeValue;
    let rawValue = target.detail?.value ?? target.value ?? '';
    if (target.checked !== undefined) {
      rawValue = !target.checked;
    }

    if (!name) {
      return;
    }

    const configKeys = name.split('.');

    if (target.data !== undefined) {
      rawValue = target.data[configKeys[configKeys.length - 1]];
      rawValue = rawValue ?? '';
    }

    try {
      const parsedValue = load(rawValue);
      const newConfig = { ...this._config };

      const stack: Array<{ parent: any; key: string }> = [];
      let currentParent: any = newConfig;

      for (let i = 0; i < configKeys.length - 1; i++) {
        const key = configKeys[i];
        stack.push({ parent: currentParent, key });
        const next = currentParent[key];
        const nextKey = configKeys[i + 1];

        if (Array.isArray(next)) {
          currentParent = [...next];
        } else if (typeof next === 'object' && next !== null) {
          currentParent = { ...next };
        } else if (!isNaN(Number(nextKey))) {
          currentParent = [];
        } else {
          currentParent = {};
        }
      }

      const lastKey = configKeys[configKeys.length - 1];
      let updatedLayer: any;
      if (Array.isArray(currentParent)) {
        updatedLayer = [...currentParent];
        updatedLayer[Number(lastKey)] = parsedValue;
      } else {
        updatedLayer = {
          ...currentParent,
          [lastKey]: parsedValue,
        };
      }

      for (let i = stack.length - 1; i >= 0; i--) {
        const { parent, key } = stack[i];
        if (Array.isArray(parent)) {
          const updatedArray = [...parent];
          updatedArray[Number(key)] = updatedLayer;
          updatedLayer = updatedArray;
        } else {
          updatedLayer = {
            ...parent,
            [key]: updatedLayer,
          };
        }
      }

      this._config = updatedLayer;
      this._error = undefined;
      this._fireConfigChanged(this._config);
    } catch (err) {
      this._error = (err as Error).message;
    }
  }

  private _addRule(): void {
    const index = this._config?.config?.rules?.length ?? 0;
    const rules = Array.isArray(this._config?.config?.rules) ? [...this._config.config.rules] : [];
    const insertIndex = Math.max(0, Math.min(index + 1, rules.length));
    rules.splice(insertIndex, 0, {element: "newElement"});

    const config = {
      ...this._config.config,
      rules,
    };

    this._config = { ...this._config, config };
    this._fireConfigChanged(this._config);
  }

  private _deleteRule(index: number): void {
    const rules = Array.isArray(this._config?.config?.rules) ? [...this._config.config.rules] : [];
    if (index < 0 || index >= rules.length) {
      return;
    }

    rules.splice(index, 1);

    const config = {
      ...this._config.config,
      rules,
    };

    this._config = { ...this._config, config };
    this._fireConfigChanged(this._config);
  }

  protected render(): TemplateResult {
    return html`
      <div class="editor">  
        ${this.renderImageSettings()}
        ${this.renderLogging()}
        ${this.renderDefaults()}

        <ha-expansion-panel outlined expanded>
            <h4 slot="header">
              <ha-icon icon="mdi:cog"></ha-icon> Rules YAML
            </h4>
            <div class="content">
              ${this._config?.config?.rules?.map((_: any, index: number) => this.renderRuleEditor(index))}
              <div class="rule-actions">
                <button class="icon-button  add-rule-button"  @click="${this._addRule}">
                  <ha-icon icon="mdi:plus"></ha-icon>
                </button>
              </div>
            </div>

        </ha-expansion-panel>
      </div>
    `;
  }


  protected renderImageSettings(): TemplateResult {
    return html`
    <ha-expansion-panel outlined>
            <h4 slot="header">
              <ha-icon icon="mdi:image-edit-outline"></ha-icon> image & styles
            </h4>
            <div class="content">
              <div class="field">
                <ha-input
                    label="Card title"
                    name="title"
                    type="text"
                    .value="${this._config?.title ?? ''}"
                    .configValue="title"
                    @input="${this._valueChanged}"
                  ></ha-input>
              </div>
              <div class="field">
                <ha-formfield
                    .label="Full Height"
                    name="full_height">
                    <ha-switch
                            label="Full Height"
                            name="full_height"
                            .checked=${this._config?.full_height}
                            .configValue="full_height"
                            @input="${this._valueChanged}"
                    ></ha-switch>

                    <div class="mdc-form-field">
                        <label class="mdc-label">Full Height</label>
                    </div>
                </ha-formfield>
              </div>

              <div class="field">
                <ha-code-editor
                    id="image_yaml"
                    name="config.image"
                    configValue="config.image"
                    mode="yaml"
                    .value=${dump(this._config?.config?.image ?? {}, { indent: 2 }) || ''}
                    @value-changed=${this._valueChanged}
                    placeholder="/local/floorplan.svg"
                  ></ha-code-editor>
                  ${this._error
                      ? html`<div class="error">Invalid YAML: ${this._error}</div>`
                      : html`<div class="help">Edit the image used in the floorplan. See <a href="https://experiencelovelace.github.io/ha-floorplan/docs/usage/#image" target="_blank">the documentation</a> for more information.</div>`}
              
              </div>
              
              <div class="field">
                <ha-input
                    label="Stylesheet URL"
                    name="config.stylesheet"
                    type="text"
                    .value="${this._config?.config?.stylesheet ?? ''}"
                    .configValue="config.stylesheet"
                    @input="${this._valueChanged}"
                ></ha-input>
              </div>

            </div>
    </ha-expansion-panel>    `;
  }

  protected renderDefaults(): TemplateResult {
    return html`
      <ha-expansion-panel outlined>
            <h4 slot="header">
              <ha-icon icon="mdi:gesture-tap"></ha-icon> Default Actions YAML
            </h4>
            <div class="content">
              <div class="field">
                <ha-code-editor
                  id="config_yaml"
                  name="config.defaults"
                  configValue="config.defaults"
                  mode="yaml"
                  .value=${dump(this._config?.config?.defaults ?? {}, { indent: 2 }) || ''}
                  @value-changed=${this._valueChanged}
                  placeholder="image: /local/floorplan.svg\nrules: []"
                ></ha-code-editor>
                ${this._error
        ? html`<div class="error">Invalid YAML: ${this._error}</div>`
        : html`<div class="help">Edit the default actions for the floorplan. See <a href="https://experiencelovelace.github.io/ha-floorplan/docs/usage/#defaults" target="_blank">the documentation</a> for more information.</div>`}
              </div>
             </div>
      </ha-expansion-panel>

    `;
  }

  protected renderLogging(): TemplateResult {
  return html`
    <ha-expansion-panel outlined>
      <h4 slot="header">
        <ha-icon icon="mdi:math-log"></ha-icon> Logging
      </h4>
      <div class="content">
        <div class="field">
          <ha-form
                .hass=${this.hass}
                .data=${{ log_level: this._config.config?.log_level || 'None' }}
                name="config.log_level"
                .schema=${[{
                      name: 'log_level',
                      selector: {
                        select: {
                          options: [
                            { label: 'None', value: '' },
                            { label: 'Error', value: 'error' },
                            { label: 'Warning', value: 'warning' },
                            { label: 'Info', value: 'info' },
                            { label: 'Debug', value: 'debug' }
                          ],
                          mode: 'dropdown'
                        }
                      }
                    }]}
                  @value-changed="${this._valueChanged}"
                  }}
            ></ha-form>
        </div>
        
        <div class="field">
          <ha-form
                .hass=${this.hass}
                .data=${{ console_log_level: this._config.config?.console_log_level || 'None' }}
                name="config.console_log_level"
                .schema=${[{
                      name: 'console_log_level',
                      selector: {
                        select: {
                          options: [
                            { label: 'None', value: '' },
                            { label: 'Error', value: 'error' },
                            { label: 'Warning', value: 'warning' },
                            { label: 'Info', value: 'info' },
                            { label: 'Debug', value: 'debug' }
                          ],
                          mode: 'dropdown'
                        }
                      }
                    }]}
                  @value-changed="${this._valueChanged}"
                  }}
            ></ha-form>
          </div>
        </div>
    </ha-expansion-panel>

    `;
  }

  protected renderRuleEditor(index: number): TemplateResult {
    return html`
      <ha-expansion-panel outlined class="rule-panel">
          <h4 slot="header">
            <div class="rule-header">
              <span>
                <ha-icon icon="mdi:border-radius"></ha-icon>
                Rule ${index + 1}${this._config?.config?.rules?.[index]?.name ? `: ${this._config.config.rules[index].name}` : ''}
              </span>
              <button
                type="button"
                class="delete-rule-button"
                @click=${() => this._deleteRule(index)}
                title="Delete rule ${index + 1}"
              >
                <ha-icon icon="mdi:trash-can-outline"></ha-icon>
              </button>
            </div>
          </h4>
          <div class="content">
            <div class="field">
              <ha-code-editor
                id="config_yaml"
                name="config.rules.${index}"
                configValue="config.rules.${index}"
                mode="yaml"
                .value=${dump(this._config?.config?.rules[index] ?? {}, { indent: 2 }) || ''}
                @value-changed=${this._valueChanged}
                placeholder="image: /local/floorplan.svg\nrules: []"
              ></ha-code-editor>
              ${this._error
      ? html`<div class="error">Invalid YAML: ${this._error}</div>`
      : html`<div class="help">Edit the floorplan rule in YAML. See <a href="https://experiencelovelace.github.io/ha-floorplan/docs/usage/#rules" target="_blank">the documentation</a> for more information.</div>`}
            </div>
          </div>
      </ha-expansion-panel>
    `;
  }



  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family, Arial, Helvetica, sans-serif);
      color: var(--primary-text-color, #15171c);
    }

    .rule-actions {
      display: flex;
      justify-content: flex-end;
      padding: 8px 0 0;
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 8px;
    }

    .delete-rule-button,
    .add-rule-button {
      cursor: pointer;
      border: 0px solid var(--divider-color, rgba(0, 0, 0, 0));
      background: var(--paper-card-background-color, #1d9c9c9a);
      color: inherit;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .delete-rule-button {
      min-width: 36px;
      background: var(--paper-card-background-color, #b922229a);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .field {
      gap: 8px;
      width: 100%;
    }
    
    .field ha-input{
      width: 100%;
      padding: 5px;
    }

    .field ha-formfield {
      width: 100%;
      padding: 15px;
    }
    
    .rule-panel h4 {
      margin: 4px 0px;
    }

    label {
      font-size: 0.95rem;
      color: var(--secondary-text-color, #525252);
    }
    
    ha-expansion-panel > .content, ha-expansion-panel .content {
        display: flex;
        flex-direction: column;
        overflow-x: visible !important;
        gap: 12px;
        margin: 12px 4px 14px;
    }
    
    ha-expansion-panel > .content > ha-expansion-panel, ha-expansion-panel .content > ha-expansion-panel {
        margin: 0;
    }

    ha-expansion-panel {
      margin: 12px;
      }

    .help,
    .error {
      font-size: 0.85rem;
    }

    .error {
      color: var(--error-color, #b91c1c);
    }
  `;
}
