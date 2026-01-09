import React from 'react';

interface Props {
  name: string;
  optional?: boolean;
}

export function Component({ name, optional }: Props): JSX.Element {
  const handleClick = () => {
    console.log('clicked');
  };

  return (
    <div>
      <h1>Hello {name}</h1>
      {optional && <p>Optional content</p>}
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}

export default Component;

async function fetchData(): Promise<string> {
  const response = await fetch('/api/data');
  return response.text();
}

class ComponentClass extends React.Component<Props> {
  render() {
    return <Component {...this.props} />;
  }
}