import './App.css'
import GoodComponent from './GoodComponent.tsx';
import BuggyComponent from './BuggyComponent.tsx';

function App() {
  return (
    <div>
      <GoodComponent/>
      <BuggyComponent/>
    </div>
  )
}

export default App
