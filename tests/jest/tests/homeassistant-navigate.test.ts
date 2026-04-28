import { jest } from '@jest/globals';
import { navigate } from '../../../src/lib/homeassistant/common/navigate';

describe('navigate', () => {
  let pushStateSpy: ReturnType<typeof jest.spyOn>;
  let replaceStateSpy: ReturnType<typeof jest.spyOn>;
  let dispatchEventSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    pushStateSpy = jest.spyOn(history, 'pushState').mockImplementation(() => {});
    replaceStateSpy = jest.spyOn(history, 'replaceState').mockImplementation(() => {});
    dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pushes to history by default', () => {
    navigate('/some/path');

    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/some/path');
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('replaces history when replace option is true', () => {
    navigate('/some/path', { replace: true });

    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/some/path');
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('uses pushState when replace option is false', () => {
    navigate('/some/path', { replace: false });

    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/some/path');
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('passes data to history state', () => {
    const data = { foo: 'bar' };
    navigate('/some/path', { data });

    expect(pushStateSpy).toHaveBeenCalledWith(data, '', '/some/path');
  });

  it('passes data to history state on replace', () => {
    const data = { foo: 'bar' };
    navigate('/some/path', { replace: true, data });

    expect(replaceStateSpy).toHaveBeenCalledWith(data, '', '/some/path');
  });

  it('fires location-changed event', () => {
    navigate('/some/path');

    const events = dispatchEventSpy.mock.calls.map((call: unknown[]) => call[0]);
    const locationChangedEvent = events.find(
      (event: unknown) => (event as Event).type === 'location-changed'
    );
    expect(locationChangedEvent).toBeDefined();
    expect((locationChangedEvent as CustomEvent).detail).toMatchObject({
      replace: false,
    });
  });

  it('fires location-changed event with replace true', () => {
    navigate('/some/path', { replace: true });

    const events = dispatchEventSpy.mock.calls.map((call: unknown[]) => call[0]);
    const locationChangedEvent = events.find(
      (event: unknown) => (event as Event).type === 'location-changed'
    );
    expect(locationChangedEvent).toBeDefined();
    expect((locationChangedEvent as CustomEvent).detail).toMatchObject({
      replace: true,
    });
  });

  it('handles paths with query strings', () => {
    navigate('/some/path?foo=bar');

    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/some/path?foo=bar');
  });

  it('works with empty options object', () => {
    navigate('/some/path', {});

    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/some/path');
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
