import { ListItemWithIcon } from '../../types/common';

const IconList = ({ listItems }: { listItems: ListItemWithIcon[] }) => {
  return (
    <ul className="flex flex-col min-w-full p-3 bg-chat-default dark:bg-chat-dark-inverse rounded-lg shadow-lg absolute top-[60px] left-0 text-nowrap font-light z-10">
      {listItems.map((item) => (
        <li
          className="flex items-center gap-3 py-3 px-2 cursor-pointer rounded-lg dark:fill-chat-default dark:text-chat-default hover:bg-interactive-secondary dark:hover:bg-interactive-tertiary-dark"
          key={item.label}
          onClick={item.action}
        >
          {item.icon}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
};

export default IconList;
