import { AnalyticsService } from '../src/analytics/analytics.service';

describe('AnalyticsService SQL aggregation', () => {
  it('aggregates statistics through SQL instead of loading all events into memory', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          countryCode: 'US',
          jobId: 'job-1',
          activeUsers: '2',
          detailViews: '2',
          contactClicks: '1',
        },
      ]),
    };

    const repository = {
      find: jest.fn(() => {
        throw new Error('statistics must not load raw analytics events');
      }),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    const service = new AnalyticsService(repository as never);
    const result = await service.statistics({ countryCode: 'US', jobId: 'job-1' });

    expect(repository.find).not.toHaveBeenCalled();
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('event');
    expect(result.items).toEqual([
      {
        countryCode: 'US',
        jobId: 'job-1',
        activeUsers: 2,
        detailViews: 2,
        contactClicks: 1,
        contactClickRate: 0.5,
      },
    ]);
  });
});
