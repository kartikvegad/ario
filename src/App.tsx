import { StoreProvider } from './store.tsx';
import { UiProvider } from './ui.tsx';
import { Shell } from './components/shell.tsx';

export default function App() {
  return (
    <StoreProvider>
      <UiProvider>
        <Shell />
      </UiProvider>
    </StoreProvider>
  );
}
